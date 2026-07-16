import { api } from './api.js';

export const configService = {
  async getPorcentajes(year) {
    return api.get('config/porcentajes', { year });
  },

  async updatePorcentajes(data) {
    return api.post('config/porcentajes', data);
  },

  async grantAccess() {
    return api.post('config/grant-access', {});
  },
};
