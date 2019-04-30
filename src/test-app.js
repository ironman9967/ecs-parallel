
import { create } from './index.js'

create(({
	createSystem,
	finished
}) => {
	createSystem({
		systemId: 'person',
		filter: [
			{ componentId: 'name' },
			{ componentId: 'eyeColor', readonly: true }
		],
		run: ({
			jobData: { nameAppendChar, eyeAppendChar },
			name,
			eyeColor
		}) => new Promise(resolve => setTimeout(() => resolve({
			name: name + nameAppendChar,
			eyeColor: eyeColor + eyeAppendChar
		}), 250))
	})
	finished()
}, async ({
	createComponentCreator,
	createEntityCreator,
	systems: { person },
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

	namedBobComponent.observe.subscribe(evt => console.log('named bob component', evt))
	bob.observe.subscribe(evt => console.log('bob entity', evt))
	person.observe.subscribe(evt => console.log('person system', evt))

	const go = async () => {
		const runs = await person.run({
			entities: [
				bob,
				jane
			],
			jobData: { nameAppendChar: '#', eyeAppendChar: '%' }
		})
	}
	await go()
	// const going = setInterval(go, 2000)
	// setTimeout(() => {
		// clearInterval(going)
		dispose()
	// }, 3000)
})
