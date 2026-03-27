import api from './client';
import { ENDPOINTS } from './constants';

export const getTeams = () => api.get(ENDPOINTS.TEAMS.LIST);

export const createTeam = (name, parentTeamId = null) =>
  api.post(ENDPOINTS.TEAMS.CREATE, { name, parent_team_id: parentTeamId });

export const getTeamDetail = (id) => api.get(ENDPOINTS.TEAMS.DETAIL(id));

export const updateTeam = (id, data) => api.put(ENDPOINTS.TEAMS.UPDATE(id), data);

export const deleteTeam = (id) => api.delete(ENDPOINTS.TEAMS.DELETE(id));

export const addTeamMember = (teamId, userId) =>
  api.post(ENDPOINTS.TEAMS.ADD_MEMBER(teamId), { user_id: userId });

export const removeTeamMember = (teamId, userId) =>
  api.delete(ENDPOINTS.TEAMS.REMOVE_MEMBER(teamId, userId));
