
import uuid from 'uuid/v4'

const createEntityCreator = ({ id, }) => () => {
	const components = []
	return {
		id,
		instanceId: uuid(),
		addComponent: ({ component }) => components.push(component),
		getComponent: ({ id }) => components.find(({ id: componentId }) => id == componentId)
	}
}
const createComponentCreator = ({ id }) => ({
	id,
	create: ({ data }) => ({
		id,
		instanceId: uuid(),
		data
	})
})
const namedComponentCreator = createComponentCreator({ id: 'named' })
const namedBobComponent = namedComponentCreator.create({ data: { name: 'bob' } })
const namedJaneComponent = namedComponentCreator.create({ data: { name: 'jane' } })

const eyeColorComponentCreator = createComponentCreator({ id: 'eye' })
const eyeColorBobComponent = eyeColorComponentCreator.create({ data: { color: 'blue' } })
const eyeColorJaneComponent = eyeColorComponentCreator.create({ data: { color: 'brown' } })

const personEntityCreator = createEntityCreator({ id: 'person' })
const bob = personEntityCreator()
const jane = personEntityCreator()

bob.addComponent({ component: namedBobComponent })
bob.addComponent({ component: eyeColorBobComponent })

jane.addComponent({ component: namedJaneComponent })
jane.addComponent({ component: eyeColorJaneComponent })

const createSystem = ({ filter, run }) => ({
	filter,
	run
})

const system = createSystem({
	filter: [{
		id: namedComponentCreator.id,
		readonly: false
	}, {
		id: eyeColorComponentCreator.id,
		readonly: true
	}],
	run: ({
		named,
		eye
	}) => {
		named.name += '1'
		eye.color += '2'

		console.log({
			name: named.name,
			color: eye.color
		})

	}
})

const engine = ({
	tickInMs = 1000
} = {}) => {
	const systems = [ system ]
	const entities = [ bob, jane ]
	const run = () => Promise.all(systems.map(({
		filter,
		run
	}) => {
		const systemCalls = entities.reduce((systemCalls, entity) => {
			const matchingComponents = filter.reduce((matchingComponents, {
				id: filterComponentId,
				readonly
			}) => {
				const component = entity.getComponent({ id: filterComponentId })
				if (component) {
					matchingComponents.push({
						readonly,
						component
					})
				}
				return matchingComponents
			}, [])
			if (matchingComponents.length == filter.length) {
				systemCalls.push(matchingComponents.map(({
					component,
					readonly
				}) => ({
					...component,
					data: readonly
						? { ...component.data }
						: component.data
				})))
			}
			return systemCalls
		}, [])
		return systemCalls.map(call => {
			let componentObj = {}
			componentObj = call.reduce((componentObj, component) => {
				componentObj[component.id] = component.data
				return componentObj
			}, componentObj)
			return run.call(void 0, componentObj)
		})
	}))
	const start = () => run().then(() => setTimeout(start, tickInMs))
	return { start }
}

engine().start()

// const d = { some: 'data' }

// const u = d => d.some += '-'

// setInterval(() => {
// 	u(d)
// 	console.log(d)
// }, 2000)
