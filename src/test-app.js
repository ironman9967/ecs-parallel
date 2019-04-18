
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
			componentId: 'eye'
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
			componentId: 'named'
		}, {
			componentId: 'eye'
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
			console.log('id', entity.id)
			console.log('named', entity.getComponent({ componentId: 'named' }).data.name)
			console.log('eye', entity.getComponent({ componentId: 'eye' }).data.color)
			console.log('**********')
		})
		await logging.run({ entities: [ bob, jane ] })
	}
	await go()
	setInterval(go, 2500)

	// dispose()
})
