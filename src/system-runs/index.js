
export const getSystemRuns = ({
	isEqual,
	systemId,
	jobData,
	entities,
	filter,
	jobs,
	meta,
	pubSystem
}) => {
	const systemEvalData = {
		systemId,
		filter,
		jobData
	}
	return entities.reduce((systemCalls, entity) => {
		const entityEvalData = {
			...systemEvalData,
			entity
		}
		pubSystem({
			event: 'system-evaluating-entity',
			...entityEvalData
		})
		const matchingComponents = filter.reduce((matchingComponents, {
			componentId
		}) => {
			const component = entity.getComponent({ componentId })
			const componentEvalData = {
				...entityEvalData,
				component
			}
			pubSystem({
				event: 'system-evaluating-entity-component',
				...componentEvalData
			})
			if (component) {
				pubSystem({
					event: 'system-evaluating-entity-match',
					...componentEvalData
				})
				matchingComponents.push({ component })
			}
			else {
				pubSystem({
					event: 'system-evaluating-entity-mismatch',
					...componentEvalData
				})
			}
			return matchingComponents
		}, [])
		pubSystem({
			event: 'system-entity-matching-components',
			...entityEvalData,
			matchingComponents
		})
		if (matchingComponents.length == filter.length) {
			pubSystem({
				event: 'system-entity-match',
				...entityEvalData
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
						const equalsResult = isEqual(result[k])
						if (component) {
							allComponents.push(component)
							const { readonly } = filter.find(({ componentId }) => componentId == k)
							if (!readonly) {
								if (!equalsResult(component.data)) {
									updatedComponents.push(component)
								}
								component.data = result[k]
							}
							else {
								readonlyComponents.push(component)
							}
						}
					})
				}
				pubSystem({
					event: 'system-run-entity-complete',
					...entityEvalData,
					result,
					components: {
						all: allComponents,
						updated: updatedComponents,
						readonly: readonlyComponents
					}
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
