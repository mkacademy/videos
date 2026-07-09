import { Tree, getCurAppName, orderEntitiesRootToLeafForWebapp } from './utils'
import Boss from './components/Core/Boss'
import Minion from './components/Core/Minion'
import Sifter from './components/Core/Sifter'
import Filter from './components/Core/Filter'
import Underboss from './components/Core/Underboss'
import Dashboard from './components/Core/Dashboard'
import Foundation from './components/Core/Foundation'
import Instruction from './components/Core/Instruction'
import { store } from './store'
import { initializedLoading } from './store/slices/sessionSlice'
import { resetPagination } from './store/slices/paginationSlice'
import { tabluarPrefixes, userApps } from './constants'

// Re-export constants for backward compatibility
export { tabluarPrefixes, userApps }

// Initialize entities
const entities = [
  Boss,
  Minion,
  Sifter,
  Filter,
  Underboss,
  Dashboard,
  Instruction,
  Foundation,
]

Tree.setEntities(entities)

// Initialize routes after Tree is set up
const routes = orderEntitiesRootToLeafForWebapp(entities, getCurAppName(1)).map(entity => entity.name)
store.dispatch(initializedLoading({ 
  curRoutes: routes,
  affix: tabluarPrefixes[0] // Set initial affix
}))

// Reset pagination state now that userApps is available
store.dispatch(resetPagination()) 