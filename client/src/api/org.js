import api from './client';
import { ENDPOINTS } from './constants';

export const getOrg = () => api.get(ENDPOINTS.ORG.GET);

export const updateOrg = (data) => api.put(ENDPOINTS.ORG.UPDATE, data);

export const getOrgMembers = () => api.get(ENDPOINTS.ORG.MEMBERS);

export const updateMemberRole = (userId, role) =>
  api.put(ENDPOINTS.ORG.MEMBER_ROLE(userId), { role });

export const removeMember = (userId) =>
  api.delete(ENDPOINTS.ORG.REMOVE_MEMBER(userId));

export const transferOwnership = (newOwnerId) =>
  api.post(ENDPOINTS.ORG.TRANSFER, { new_owner_id: newOwnerId });

export const sendInvite = (email, role) =>
  api.post(ENDPOINTS.INVITE.SEND, { email, role });

export const getInviteInfo = (token) =>
  api.get(ENDPOINTS.INVITE.INFO(token));
