
import { create } from './index.js'

create(({
	createSystem,
	finished
}) => {
	createSystem({
		name: 'person',
		filter: [{
			componentId: 'name'
		}, {
			componentId: 'eyeColor',
			readonly: true
		}],
		run: ({
			jobData: { nameAppendChar, eyeAppendChar },
			name,
			eyeColor
		}) => ({
			name: name + nameAppendChar,
			eyeColor: eyeColor + eyeAppendChar
		})
	})
	createSystem({
		name: 'logging',
		filter: [{
			componentId: 'name',
			readonly: true
		}, {
			componentId: 'eyeColor',
			readonly: true
		}],
		run: entry => console.log(entry)
	})
	finished()
}, async ({
	createComponentCreator,
	createEntity,
	systems: { person, logging },
	dispose
}) => {
	const { create: createNameComponent } = createComponentCreator({ id: 'name' })
	const namedBobComponent = createNameComponent({ data: 'bob' })
	const namedJaneComponent = createNameComponent({ data: 'jane' })

	const { create: createEyeColorComponent } = createComponentCreator({ id: 'eyeColor' })
	const eyeColorBrownComponent = createEyeColorComponent({ data: 'brown' })
	const eyeColorBlueComponent = createEyeColorComponent({ data: 'blue' })

	const bob = createEntity()
	bob.addComponent({ component: namedBobComponent })
	bob.addComponent({ component: eyeColorBrownComponent })

	const jane = createEntity()
	jane.addComponent({ component: namedJaneComponent })
	jane.addComponent({ component: eyeColorBlueComponent })

	const go = async () => {
		const runs = await person.run({
			entities: [ bob, jane ],
			jobData: { nameAppendChar: '#', eyeAppendChar: '%' }
		})
		runs.forEach(async ({
			meta: { timing: { duration } },
			entity
		}) => {
			await logging.run({
				jobData: { duration },
				entities: [ entity ]
			})
		})
	}
	await go()
	const going = setInterval(go, 2000)
	setTimeout(() => {
		clearInterval(going)
		dispose()
	}, 20000)
})
