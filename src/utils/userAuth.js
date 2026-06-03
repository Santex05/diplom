const TOKEN_KEY = 'anicatalog_user_token'

export function getUserToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setUserToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearUserToken() {
  localStorage.removeItem(TOKEN_KEY)
}
