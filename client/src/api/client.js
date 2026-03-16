// ---------------------------------------------------------------------------
// Axios instance — single shared client for the entire app
// ---------------------------------------------------------------------------

import axios from 'axios';
import { API_URL } from './constants';

const api = axios.create({
  baseURL: API_URL,
});

export default api;
