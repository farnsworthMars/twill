import Vue from 'vue'
import api from '../api/content'
import { CONTENT } from '../mutations'
import { buildBlock, isBlockEmpty } from '@/utils/getFormData.js'

const state = {
  loading: false,
  editor: window.STORE.form.editor || false,
  available: window.STORE.form.content || {},
  blocks: window.STORE.form.blocks || [],
  previews: window.STORE.form.previews || {},
  active: {}
}

// getters
const getters = {
  previewsById (state) {
    return id => state.previews[id] ? state.previews[id] : ''
  }
}

function setBlockID () {
  return Date.now()
}

const mutations = {
  [CONTENT.ADD_BLOCK] (state, blockInfos) {
    let block = blockInfos.block
    block.id = setBlockID()

    if (blockInfos.index > -1) {
      state.blocks.splice(blockInfos.index, 0, block) // add after a certain position
    } else {
      state.blocks.push(block) // or add a new block at the end of the list
    }
  },
  [CONTENT.MOVE_BLOCK] (state, fromTo) {
    if (fromTo.newIndex >= state.blocks.length) {
      let k = fromTo.newIndex - state.blocks.length
      while ((k--) + 1) {
        state.blocks.push(undefined)
      }
    }
    state.blocks.splice(fromTo.newIndex, 0, state.blocks.splice(fromTo.oldIndex, 1)[0])
  },
  [CONTENT.DELETE_BLOCK] (state, index) {
    const id = state.blocks[index].id
    if (id) Vue.delete(state.previews, id)
    state.blocks.splice(index, 1)
  },
  [CONTENT.DUPLICATE_BLOCK] (state, index) {
    let clone = Object.assign({}, state.blocks[index])
    clone.id = setBlockID()

    state.blocks.splice(index + 1, 0, clone)
  },
  [CONTENT.REORDER_BLOCKS] (state, newBlocks) {
    state.blocks = newBlocks
  },
  [CONTENT.ACTIVATE_BLOCK] (state, index) {
    if (state.blocks[index]) state.active = state.blocks[index]
    else state.active = {}
  },
  [CONTENT.ADD_BLOCK_PREVIEW] (state, data) {
    Vue.set(state.previews, data.id, data.html)
  },
  [types.UPDATE_PREVIEW_LOADING] (state, loading) {
    state.loading = !state.loading
  }
}

function getBlockPreview (block, commit, rootState, callback) {
  if (block.hasOwnProperty('id')) {
    const blockData = buildBlock(block, rootState)

    if (rootState.language.all.length > 1) {
      blockData.activeLanguage = rootState.language.active.value
    }

    if (isBlockEmpty(blockData)) {
      commit(CONTENT.ADD_BLOCK_PREVIEW, {
        id: block.id,
        html: ''
      })

      if (callback && typeof callback === 'function') callback()
    } else {
      api.getBlockPreview(
        rootState.form.blockPreviewUrl,
        blockData,
        data => {
          commit(CONTENT.ADD_BLOCK_PREVIEW, {
            id: block.id,
            html: data
          })

          if (callback && typeof callback === 'function') callback()
        },
        errorResponse => {}
      )
    }
  }
}

const actions = {
  getPreview ({ commit, state, rootState }, index = -1) {
    let block = index >= 0 ? state.blocks[index] : {}

    // refresh preview of the active block
    if (state.active.hasOwnProperty('id') && index === -1) block = state.active

    getBlockPreview(block, commit, rootState)
  },
  getAllPreviews ({ commit, state, rootState }) {
    if (state.blocks.length && !state.loading) {
      commit(types.UPDATE_PREVIEW_LOADING, true)
      let loadedPreview = 0

      state.blocks.forEach(function (block) {
        getBlockPreview(block, commit, rootState, function () {
          loadedPreview++
          if (loadedPreview === state.blocks.length) commit(types.UPDATE_PREVIEW_LOADING, true)
        })
      })
    }
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
