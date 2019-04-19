
import { create } from './index.js'

create(({
	createSystem,
	finished
}) => {
	createSystem({
		name: 'person',
		filter: [
			{ componentId: 'name' },
			{ componentId: 'eyeColor', readonly: true }
		],
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
		filter: [
			{ componentId: 'name', readonly: true },
			{ componentId: 'eyeColor', readonly: true }
		],
		run: entry => console.log(entry)
	})
	finished()
}, async ({
	createComponentCreator,
	createEntityCreator,
	systems: { person, logging },
	dispose
}) => {
	const { create: createNameComponent } = createComponentCreator({ componentId: 'name' })
	const namedBobComponent = createNameComponent({ data: 'bob' })
	const namedJaneComponent = createNameComponent({ data: 'jane' })

	const { create: createEyeColorComponent } = createComponentCreator({ componentId: 'eyeColor' })
	const eyeColorBrownComponent = createEyeColorComponent({ data: 'brown' })
	const eyeColorBlueComponent = createEyeColorComponent({ data: 'blue' })

	const { create: createPersonEntity } = createEntityCreator({ entityId: 'person' })

	const bob = createPersonEntity()
	bob.addComponent({ component: namedBobComponent })
	bob.addComponent({ component: eyeColorBrownComponent })

	const jane = createPersonEntity()
	jane.addComponent({ component: namedJaneComponent })
	jane.addComponent({ component: eyeColorBlueComponent })

	const go = async () => {
		const runs = await person.run({
			entities: [ bob, jane ],
			jobData: { nameAppendChar: '#', eyeAppendChar: '%' }
		})
		runs.forEach(({
			meta: { timing: { duration } },
			entity
		}) => logging.run({ jobData: { duration }, entities: [ entity ] }))
	}
	await go()
	const going = setInterval(go, 2000)
	setTimeout(() => {
		clearInterval(going)
		dispose()
	}, 20000)
})
