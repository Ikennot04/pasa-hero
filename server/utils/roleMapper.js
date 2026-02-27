/**
 * Role ID Mapping
 * Maps role names to numeric role IDs for easier role management
 */
export const ROLE_IDS = {
  'user': 1,
  'operator': 2,
  'terminal admin': 3,
  'super admin': 4,
};

/**
 * Get role ID from role name
 * @param {string} roleName - The role name (e.g., "user", "operator", "terminal admin", "super admin")
 * @returns {number} The corresponding role ID, defaults to 1 (user) if role not found
 */
export const getRoleId = (roleName) => {
  if (!roleName) return ROLE_IDS['user'];
  const normalizedRole = roleName.toLowerCase().trim();
  return ROLE_IDS[normalizedRole] || ROLE_IDS['user'];
};

/**
 * Get role name from role ID
 * @param {number} roleId - The role ID
 * @returns {string} The corresponding role name, defaults to "user" if ID not found
 */
export const getRoleName = (roleId) => {
  const roleEntries = Object.entries(ROLE_IDS);
  const foundRole = roleEntries.find(([_, id]) => id === roleId);
  return foundRole ? foundRole[0] : 'user';
};
