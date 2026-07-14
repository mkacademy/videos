import { Tree } from './utils'
import Instruction from './components/Core/Instruction'

/** Register instruction entity so bytesFetcher can format media payloads via Tree.formattedData. */
Tree.setEntities([Instruction])
