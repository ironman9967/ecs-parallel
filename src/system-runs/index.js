
export const getSystemRuns = ({
	isEqual,
	systemCreated,
	systemId,
	jobData,
	entityPubs,
	componentPubs,
	filter,
	jobs,
	meta,
	pubSystem
}) => {
	const systemEvtData = {
		systemCreated,
		systemId,
		filter,
		jobData
	}
	return entityPubs.reduce((systemCalls, { pub: pubEntity, entity }) => {
		const entityEvtData = {
			...systemEvtData,
			entity
		}
		pubSystem({
			event: 'evaluating-entity',
			...entityEvtData
		})
		pubEntity({
			event: 'system-evaluating',
			...entityEvtData
		})
		const matchingComponents = filter.reduce((matchingComponents, {
			componentId
		}) => {
			const component = entity.getComponent({ componentId })
			const { pub: pubComponent } = componentPubs.find(({ component: { id } }) => component.id == id)
			const componentEvtData = {
				...entityEvtData,
				component
			}
			pubSystem({
				event: 'evaluating-entity-component',
				...componentEvtData
			})
			pubEntity({
				event: 'system-evaluating-component',
				...componentEvtData
			})
			pubComponent({
				event: 'system-evaluating',
				...componentEvtData
			})
			if (component) {
				pubSystem({
					event: 'evaluating-entity-match',
					...componentEvtData
				})
				pubEntity({
					event: 'system-evaluating-component-match',
					...componentEvtData
				})
				pubComponent({
					event: 'system-evaluating-match',
					...componentEvtData
				})
				matchingComponents.push({ component })
			}
			else {
				pubSystem({
					event: 'evaluating-entity-mismatch',
					...componentEvtData
				})
				pubEntity({
					event: 'system-evaluating-component-mismatch',
					...componentEvtData
				})
				pubComponent({
					event: 'system-evaluating-mismatch',
					...componentEvtData
				})
			}
			return matchingComponents
		}, [])
		pubSystem({
			event: 'entity-matching-components',
			...entityEvtData,
			matchingComponents
		})
		if (matchingComponents.length == filter.length) {
			pubSystem({
				event: 'entity-match',
				...entityEvtData
			})
			pubEntity({
				event: 'matched-system',
				...entityEvtData
			})
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
			systemCalls.push(jobs[systemId].startJob(jobArg).then(({ meta, result }) => {
				const allComponents = []
				const updatedComponents = []
				const readonlyComponents = []
				if (typeof result == 'object') {
					Object.keys(result).forEach(k => {
						const component = entity.getComponent({ componentId: k })
						const { pub: pubComponent } = componentPubs.find(({ component: { id } }) => component.id == id)
						const equalsResult = isEqual(result[k])
						if (component) {
							const { readonly } = filter.find(({ componentId }) => componentId == k)
							pubComponent({
								event: 'system-run-complete',
								...entityEvtData,
								meta,
								previousData: component.data,
								result: result[k],
								component,
								readonly: !readonly ? false : true
							})
							allComponents.push(component)
							if (!readonly) {
								const updated = !equalsResult(component.data)
								component.data = result[k]
								if (updated) {
									pubComponent({
										event: 'data-updated',
										...entityEvtData,
										meta,
										previousData: component.data,
										newData: result[k],
										component,
										readonly: !readonly ? false : true
									})
									updatedComponents.push(component)
								}
							}
							else {
								readonlyComponents.push(component)
							}
						}
					})
				}
				const runResults = {
					...entityEvtData,
					meta,
					result,
					components: {
						all: allComponents,
						updated: updatedComponents,
						readonly: readonlyComponents
					}
				}
				pubSystem({
					event: 'run-entity-complete',
					...runResults
				})
				pubEntity({
					event: 'system-run-complete',
					...runResults
				})
				return {
					meta,
					entity
				}
			}))
		}
		return systemCalls
	}, [])
}
