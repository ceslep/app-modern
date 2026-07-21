import { api } from './api.js';

class ActivityService {
  getRecent() {
    return api.get('activity/recent');
  }

  logModuleAccess(modulo, label) {
    return api.post('activity/log', { modulo, label });
  }
}

export const activity = new ActivityService();
