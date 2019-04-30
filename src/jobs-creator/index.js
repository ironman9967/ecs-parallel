
export default async ({
	prep,
	app,
	newId,
	now,
	createSubject: createUnwrappedSubject,
	isEqual,
	getSystemRuns
}) => async ({
	meta,
	createJob,
	finished
}) => {
	const systems = []
	const entityPubs = []
	const componentPubs = []
	const unsubs = []

	const createSubject = () => {
		const {
			subscribe,
			filter,
			next
		} = createUnwrappedSubject()
		const wrapSubscribe = (subscribe, cb) => {
			const { unsubscribe } = subscribe(cb)
			unsubs.push(unsubscribe)
			return { unsubscribe }
		}
		return {
			next: evt => next({ created: now(), ...evt }),
			subscribe: cb => wrapSubscribe(subscribe, cb),
			filter: cb => {
				const { subscribe } = filter(cb)
				return {
					subscribe: cb => wrapSubscribe(subscribe, cb)
				}
			}
		}
	}

	await prep({
		createSystem: ({ systemId, filter, run }) => {
			const observeSystem = createSubject()
			const { observeJob } = createJob({ name: systemId, work: run })
			const system = {
				systemId,
				created: now(),
				filter,
				observeSystem,
				observeJob
			}
			systems.push(system)
		},
		finished: () => finished(({
			jobs,
			// jobsArray,
			dispose
		}) => {
			const createEntityCreator = ({ entityId = newId() } = {}) => ({
				entityId,
				create: ({ id = newId() } = {}) => {
					const components = []
					const {
						next,
						...observe
					} = createSubject()
					const entity = {
						entityId,
						id,
						observe,
						addComponent: ({ component }) => {
							if (component.componentId == 'jobData') {
								throw new Error(`'jobData' is a reserved componentId`)
							}
							if (components.find(({ componentId }) => componentId == component.componentId)) {
								throw new Error(`component ${component.id} has already been added to entity ${entityId}`)
							}
							components.push(component)
						},
						getComponent: ({ componentId }) => components.find(({ componentId: cid }) => componentId == cid)
					}
					entityPubs.push({ pub: next, entity })
					return entity
				}
			})
			const createComponentCreator = ({ componentId = newId() } = {}) => ({
				componentId,
				create: ({ data, id = newId() } = {}) => {
					const {
						next,
						...observe
					} = createSubject()
					const component = { componentId, id, observe, data }
					componentPubs.push({ pub: next, component })
					return component
				}
			})
			return app({
				createEntityCreator,
				createComponentCreator,
				createEntityFromObject: ({ obj, entityId }) => {
					const { create } = createEntityCreator({ entityId })
					const entity = create()
					Object.keys(obj).forEach(k => {
						const { create } = createComponentCreator({ componentId: k })
						const component = create({ data: obj[k] })
						entity.addComponent({ component })
					})
					return entity
				},
				systems: systems.reduce((systems, {
					observeSystem: {
						next: pubSystem,
						...observe
					},
					observeJob: {
						subscribe: subJob
					},
					created: systemCreated,
					systemId,
					filter
				}) => {
					subJob(({ event, ...job }) => pubSystem({ event: `system-${event}`, ...job }))
					systems[systemId] = {
						systemCreated,
						systemId,
						filter,
						observe,
						run: async ({
							jobData,
							entities: userPassedEntities
						}) => {
							pubSystem({
								event: 'running',
								systemCreated,
								systemId,
								filter,
								jobData,
								entities: userPassedEntities
							})
							return Promise.all(getSystemRuns({
								isEqual,
								systemCreated,
								systemId,
								jobData,
								entityPubs: entityPubs.filter(({ entity }) => userPassedEntities.find(({ id }) => entity.id == id)),
								componentPubs,
								filter,
								jobs,
								meta,
								pubSystem
							}))
						}
					}
					return systems
				}, {}),
				dispose: async () => {
					unsubs.forEach(unsub => unsub())
					return await dispose()
				}
			})
		})
	})
}
