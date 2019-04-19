
export default async ({
	prep,
	app,
	newId
}) => async ({
	meta,
	createJob,
	finished
}) => {
	const systems = []
	prep({
		createSystem: ({ name, filter, run }) => {
			createJob({ name, work: run })
			systems.push({ name, filter })
		},
		finished: () => finished(({
			jobs,
			dispose
		}) => app({
			createEntityCreator: ({ entityId = newId() } = {}) => ({
				entityId,
				create: ({ id = newId() } = {}) => {
					const components = []
					return {
						entityId,
						id,
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
				}
			}),
			createComponentCreator: ({ componentId = newId() } = {}) => ({
				componentId,
				create: ({ data, id = newId() } = {}) => ({ componentId, id, data })
			}),
			systems: systems.reduce((systems, {
				name,
				filter
			}) => {
				systems[name] = {
					name,
					filter,
					run: async ({
						jobData,
						entities
					}) => Promise.all(entities.reduce((systemCalls, entity) => {
						const matchingComponents = filter.reduce((matchingComponents, {
							componentId
						}) => {
							const component = entity.getComponent({ componentId })
							if (component) {
								matchingComponents.push({ component })
							}
							return matchingComponents
						}, [])
						if (matchingComponents.length == filter.length) {
							const jobArg = matchingComponents.reduce((jobCall, {
								component: {
									componentId,
									data
								}
							}) => {
								jobCall[componentId] = data
								return jobCall
							}, {})
							if (jobData) {
								jobArg.jobData = jobData
							}
							systemCalls.push(jobs[name].startJob(jobArg).then(({ meta, result }) => {
								if (typeof result == 'object') {
									Object.keys(result).forEach(k => {
										const component = entity.getComponent({ componentId: k })
										if (component) {
											const { readonly } = filter.find(({ componentId }) => componentId == k)
											if (!readonly) {
												component.data = result[k]
											}
										}
									})
								}
								return {
									meta,
									entity
								}
							}))
						}
						return systemCalls
					}, []))
				}
				return systems
			}, {}),
			dispose
		}))
	})
}
