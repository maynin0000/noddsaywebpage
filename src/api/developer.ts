import { ApiError } from './webAuth'

export type MotionCount = { motion: string; target: 'slot' | 'team'; targetId: number; asked: number; recognized: number; timedOut: number; cancelled: number; pending: number }
export type SeatCount = { slot: number; forward: number; backward: number; rejected: Record<string, number>; present: boolean | null }
export type Live = { motionCollected: boolean; sequence: number; seats: SeatCount[]; requests: MotionCount[] | null; teams: { teamId: number; progress: number; itemsUsed: number; obstacleCollisions: number; terrainCollisions: number }[] }
export type Result = { endReason: string; teams: { teamId: number; completed: boolean; finishTimeMs: number | null; result: string }[]; itemEvents?: { id: string; elapsedMs: number; actorTeam: number; itemName: string; eventType: string }[]; collisionEvents?: { id: string; elapsedMs: number; teamId: number; category: string; targetName: string }[] }
export type Game = { userId: string; eventId: string; mapId: string; mapName: string; mapVersion: string; clientVersion: string; inputMode: string; startedAt: string; receivedAt: string; state: string; elapsedMs: number; live: Live | null; result: Result | null }
export type MapStat = { mapName: string; mapVersion: string; clientVersion: string; games: number; telemetryGames: number; motionGames: number; finishedTeams: number; totalTeams: number; averageFinishMs: number | null; forward: number; backward: number; recognized: number; timedOut: number }
export type Listing = { serverTime: string; total: number; activeCount: number; games: Game[]; stats: MapStat[] }
export const base = '/api/v1/web/developer/games'

export async function developerGet(path: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { code?: string }
    throw new ApiError(response.status, body.code ?? 'HTTP_ERROR', '')
  }
  return response
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 필요합니다. 웹사이트에 로그인한 뒤 이 페이지로 돌아와 주세요.'
    if (error.status === 403) return '개발자 권한이 있는 계정만 사용할 수 있습니다.'
    if (error.code === 'NARROW_DATE_RANGE') return '조회 가능한 5,000경기를 초과했습니다. 기간을 줄여 주세요.'
    if (error.status === 429) return '조회가 많아 잠시 쉬고 있습니다. 잠시 후 다시 시도해 주세요.'
    if (error.status === 400) return '조회 조건을 확인해 주세요. 시작 시각은 종료 시각보다 빨라야 합니다.'
  }
  return '서버에 연결하지 못했습니다. 표시된 값은 마지막으로 수신한 기록입니다.'
}
