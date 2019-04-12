
import createJobRunner from 'parallel-job-runner'

createJobRunner()
.then(({
	meta: { isMaster },
	createJob: createRawJob,
	dispose: disposeJobRunner
}) => ({
	isMaster,
	createRawJob,
	disposeJobRunner,
	createSystem: () => {},
	createComponent: () => {},
	createEntity: () => {}
}))
.then(({
	isMaster,
	createRawJob,
	disposeJobRunner,
	createSystem,
	createComponent,
	createEntity,
}) => disposeJobRunner())
