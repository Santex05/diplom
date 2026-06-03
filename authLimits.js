/** Лимиты логина, никнейма и пароля (фронт + server). */

export const LOGIN_MIN = 3
export const LOGIN_MAX = 16
export const NICKNAME_MAX = 16
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 20

export function normalizeLogin(login) {
  return String(login ?? '').trim().toLowerCase()
}

export function normalizeNickname(nickname) {
  return String(nickname ?? '').trim()
}

export function assertLogin(login) {
  const l = normalizeLogin(login)
  if (!l || l.length < LOGIN_MIN) {
    throw new Error(`Логин: от ${LOGIN_MIN} до ${LOGIN_MAX} символов`)
  }
  if (l.length > LOGIN_MAX) {
    throw new Error(`Логин: не длиннее ${LOGIN_MAX} символов`)
  }
  return l
}

export function assertNickname(nickname) {
  const nick = normalizeNickname(nickname)
  if (!nick) throw new Error('Укажите никнейм')
  if (nick.length > NICKNAME_MAX) {
    throw new Error(`Никнейм: не длиннее ${NICKNAME_MAX} символов`)
  }
  return nick
}

export function assertPassword(password, label = 'Пароль') {
  const p = String(password ?? '')
  if (!p || p.length < PASSWORD_MIN) {
    throw new Error(`${label}: от ${PASSWORD_MIN} до ${PASSWORD_MAX} символов`)
  }
  if (p.length > PASSWORD_MAX) {
    throw new Error(`${label}: не длиннее ${PASSWORD_MAX} символов`)
  }
  return p
}
