
import newId from 'uuid/v4'

import now from 'performance-now'

import { isEqual } from 'lodash/fp'

import { createSubject } from 'subject-with-filter'

import pjr from 'parallel-job-runner'

import jc from './jobs-creator'
import { getSystemRuns } from './system-runs'

export const create = async (prep, app) => await (await jc({
	prep,
	app,
	newId,
	now,
	isEqual,
	createSubject,
	getSystemRuns
}))(await pjr())
