
import { create } from './index.js'

create(({
	createSystem,
	finished
}) => {
	createSystem({
		name: 'person',
		filter: [{
			componentId: 'named'
		}, {
			componentId: 'eye',
			readonly: true
		}],
		run: ({
			named: {
				name
			},
			eye: {
				color
			}
		}) => ({
			named: {
				name: name + '-'
			},
			eye: {
				color: color + '='
			}
		})
	})
	createSystem({
		name: 'logging',
		filter: [{
			componentId: 'named',
			readonly: true
		}, {
			componentId: 'eye',
			readonly: true
		}],
		run: entry => console.log(entry)
	})
	finished()
}, async ({
	createComponentCreator,
	createEntity,
	systems: {
		person,
		logging
	},
	dispose
}) => {
	const { create: createNameComponent } = createComponentCreator({ id: 'named' })
	const namedBobComponent = createNameComponent({ data: { name: 'bob' } })
	const namedJaneComponent = createNameComponent({ data: { name: 'jane' } })

	const { create: createEyeColorComponent } = createComponentCreator({ id: 'eye' })
	const eyeColorBrownComponent = createEyeColorComponent({ data: { color: 'brown' } })
	const eyeColorBlueComponent = createEyeColorComponent({ data: { color: 'blue' } })

	const bob = createEntity()
	bob.addComponent({ component: namedBobComponent })
	bob.addComponent({ component: eyeColorBrownComponent })

	const jane = createEntity()
	jane.addComponent({ component: namedJaneComponent })
	jane.addComponent({ component: eyeColorBlueComponent })

	const go = async () => {
		const runs = await person.run({ entities: [ bob, jane ] })
		runs.forEach(({ meta, entity }) => {
			console.log('**********')
			console.log('entity id', entity.id)
			console.log('timing', meta.timing)
		})
		await logging.run({ entities: [ bob, jane ] })
		console.log('**********')
	}
	await go()
	setInterval(go, 2500)

	// dispose()
})
