
import newId from 'uuid/v4'

import pjr from 'parallel-job-runner'

import jc from './jobs-creator'

export const create = async (prep, app) => await (await jc({
	prep,
	app,
	newId
}))(await pjr())
