
import newId from 'uuid/v4'

import now from 'performance-now'

import { createSubject } from 'subject-with-filter'

import pjr from 'parallel-job-runner'

import jc from './jobs-creator'

export const create = async (prep, app) => await (await jc({
	prep,
	app,
	newId,
	now,
	createSubject
}))(await pjr())
