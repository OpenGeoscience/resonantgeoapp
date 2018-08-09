import Vue from 'vue';
import Vuex from 'vuex';
import pointOnFeature from '@turf/point-on-feature';

import girder from '../girder';
import { remove } from '../utils/array';
import prompt from '../components/prompt/module';
import loadDatasets from '../utils/loadDataset';
import loadDatasetData from "../utils/loadDatasetData";
import { summarize } from "../utils/geojsonUtil";
import { getDefaultGeojsonVizProperties } from "../utils/getDefaultGeojsonVizProperties";

Vue.use(Vuex);

export default new Vuex.Store({
  strict: false,
  state: {
    sidePanelExpanded: true,
    datasets: [],
    datasetIdMetaMap: {},
    datasetSortBy: 'type',
    groups: [],
    selectedDataset: null,
    workspaces: {
      '0': {
        layers: []
      }
    },
    focusedWorkspaceKey: '0'
  },
  mutations: {
    toggleSidePanel(state) {
      state.sidePanelExpanded = !state.sidePanelExpanded;
    },
    setDatasets(state, datasets) {
      datasets.forEach((dataset) => {
        if (!dataset.meta || !dataset.meta.vizProperties) {
          Object.assign(dataset, { meta: { vizProperties: getDefaultGeojsonVizProperties() } });
        }
      });
      state.datasets = datasets;
    },
    setSelectedDataset(state, dataset) {
      state.selectedDataset = dataset;
    },
    addWorkspace(state) {
      Vue.set(state.workspaces, Math.random().toString(36).substring(7), {
        layers: []
      })
    },
    removeWorkspace(state, key) {
      Vue.delete(state.workspaces, key);
    },
    setFocusedWorkspaceKey(state, key) {
      state.focusedWorkspaceKey = key;
    },
    _addDatasetToWorkspace(state, { dataset, workspace }) {
      workspace.layers.push({ dataset, opacity: 1 });
    },
    removeDatasetFromWorkspace(state, { dataset, workspace }) {
      workspace.layers.splice(workspace.layers.map(layers => layers.dataset).indexOf(dataset), 1);
    },
    setWorkspaceLayers(state, { workspace, layers }) {
      workspace.layers = layers;
    },
    setWorkspaceLayerOpacity(state, { layer, opacity }) {
      layer.opacity = opacity;
    },
    setGroup(state, groups) {
      state.groups = groups;
    },
    addGroup(state, group) {
      state.groups.push(group);
    },
    removeGroup(state, group) {
      remove(state.groups, group);
    },
    addDatasetToGroup(state, { group, dataset }) {
      remove(group.datasetIds, dataset._id);
      group.datasetIds.push(dataset._id);
    },
    removeDatasetFromGroup(state, { group, dataset }) {
      remove(group.datasetIds, dataset._id);
    }
  },
  actions: {
    async loadDatasets({ commit }) {
      commit('setDatasets', await loadDatasets());
    },
    async loadGroups({ commit }) {
      commit('setGroup', (await girder.rest.get('dataset_group')).data);
    },
    async createGroup({ commit }, name) {
      commit('addGroup', (await girder.rest.post('dataset_group', { name, datasetIds: [] })).data);
    },
    async deleteGroup({ commit }, group) {
      await girder.rest.delete(`dataset_group/${group._id}`);
      commit('removeGroup', group);
    },
    async addDatasetToGroup({ state, commit }, { group, dataset }) {
      commit('addDatasetToGroup', { group, dataset });
      return girder.rest.put(`dataset_group/${group._id}`, group);
    },
    async removeDatasetFromGroup({ state, commit }, { group, dataset }) {
      commit('removeDatasetFromGroup', { group, dataset });
      return girder.rest.put(`dataset_group/${group._id}`, group);
    },
    async addDatasetToWorkspace({ state, commit }, { dataset, workspace }) {
      if (!(dataset._id in state.datasetIdMetaMap)) {
        Vue.set(state.datasetIdMetaMap, dataset._id, await getDatasetMeta(dataset, state.datasetIdMetaMap));
      }
      workspace.layers.push({ dataset, opacity: 1 });
    }
  },
  getters: {
    focusedWorkspace(state) {
      return state.workspaces[state.focusedWorkspaceKey];
    },
    selectedDatasetPoint(state) {
      if (!state.selectedDataset) {
        return null;
      }
      return pointOnFeature(state.selectedDataset.geometa.bounds).geometry;
    }
  },
  modules: {
    prompt
  }
});


async function getDatasetMeta(dataset) {
  if (dataset.geometa.driver === "GeoJSON") {
    var geojson = await loadDatasetData(dataset);
    var summary = summarize(geojson);
    return { geojson, summary };
  } else {
    return null;
  }
}
