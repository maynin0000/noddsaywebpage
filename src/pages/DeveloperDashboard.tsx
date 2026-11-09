import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/context'
import { ApiError } from '../api/webAuth'
import { base, developerGet, errorMessage, type Game, type Listing, type MotionCount } from '../api/developer'
import './developer-dashboard.css'

const labels: Record<string, string> = { PLAYING: '플레이 중', PAUSED: '일시정지', STALE: '연결 확인 필요', FINISHED: '종료', INTERRUPTED: '중단' }
const modes: Record<string, string> = { CAMERA: '카메라', KEYBOARD: '키보드', AUTOMATED_TEST: '자동 검증' }
const rejects: Record<string, string> = { STUNNED: '기절', COOLDOWN: '쿨다운', AIRBORNE: '공중', COURSE_BLOCKED: '코스 제한', ESCAPE_HELD: '탈출 대기' }
const count = (v: number) => v.toLocaleString('ko-KR')
const duration = (v: number | null | undefined) => v == null ? '미완주' : `${Math.floor(v / 60000)}:${(v % 60000 / 1000).toFixed(3).padStart(6, '0')}`
const date = (v: string) => new Date(v).toLocaleString('ko-KR', { hour12: false })
const sum = (rows: MotionCount[], key: 'recognized' | 'timedOut' | 'cancelled' | 'pending') => rows.reduce((n, r) => n + r[key], 0)
function Badge({ state }: { state: string }) { return <span className={`dev-badge state-${state}`}>{labels[state] ?? state}</span> }
function MotionTable({ rows }: { rows: MotionCount[] }) {
  return <div className="dev-scroll"><table><thead><tr><th>대상</th><th>요청 동작</th><th>요청</th><th>성공</th><th>시간 초과</th><th>취소</th><th>대기</th><th>성공률</th></tr></thead><tbody>
    {rows.map(r => <tr key={`${r.target}-${r.targetId}-${r.motion}`}><td>{r.target === 'slot' ? '자리' : '팀'} {r.targetId}</td><td>{r.motion}</td><td>{r.asked}</td><td>{r.recognized}</td><td>{r.timedOut}</td><td>{r.cancelled}</td><td>{r.pending}</td><td>{r.recognized + r.timedOut ? `${(100 * r.recognized / (r.recognized + r.timedOut)).toFixed(1)}%` : '—'}</td></tr>)}
  </tbody></table>{rows.length === 0 && <p className="dev-empty">이 경기에는 집계된 동작 요청이 없습니다.</p>}</div>
}
function Detail({ game, close }: { game: Game; close: () => void }) {
  const motion = game.live?.requests
  return <section className="dev-panel dev-detail" aria-label="경기 상세">
    <div className="dev-panel-heading"><div><p className="dev-eyebrow">MATCH DETAIL</p><h2>{game.mapName} <Badge state={game.state} /></h2><p className="dev-muted">{date(game.startedAt)} · {modes[game.inputMode]} · 빌드 {game.clientVersion}</p></div><button onClick={close} className="dev-button">상세 닫기</button></div>
    <p className="dev-id">경기 {game.eventId} · 계정 {game.userId}</p>
    {game.live ? <>
      <div className="dev-seat-grid">{game.live.seats.map(s => {
        const requests = motion?.filter(r => r.target === 'slot' && r.targetId === s.slot)
        return <article className="dev-seat" key={s.slot}><div className="dev-seat-title"><h3>{Math.ceil(s.slot / 2)}팀 · 자리 {s.slot}</h3><span>{s.present == null ? '인식 미수집' : s.present ? '인식됨' : '인식 안 됨'}</span></div>
          <div className="dev-strokes"><strong>{count(s.forward + s.backward)}</strong><span>적용된 젓기</span></div><p>전진 {count(s.forward)} · 후진 {count(s.backward)}</p>
          <p className="dev-muted">입력 거부 {count(Object.values(s.rejected).reduce((a, b) => a + b, 0))}회</p><div className="dev-reasons">{Object.entries(rejects).map(([k, label]) => <span key={k}>{label} {s.rejected[k] ?? 0}</span>)}</div>
          <div className="dev-seat-results">{requests ? <>동작 성공 <b>{sum(requests, 'recognized')}</b> / 시간 초과 <b>{sum(requests, 'timedOut')}</b><br /><small>취소 {sum(requests, 'cancelled')} · 대기 {sum(requests, 'pending')}</small></> : '동작 통계 미수집'}</div>
        </article>
      })}</div>
      <h3>팀별 진행</h3><div className="dev-team-grid">{game.live.teams.map(t => <div className="dev-team" key={t.teamId}><div><b>{t.teamId}팀</b><span>{(t.progress * 100).toFixed(1)}%</span></div><progress max={1} value={t.progress} aria-label={`${t.teamId}팀 진행률`} /><p>아이템 사용 {t.itemsUsed} · 장애물 충돌 {t.obstacleCollisions} · 지형 충돌 {t.terrainCollisions}</p></div>)}</div>
    </> : <p className="dev-empty">실시간 계측이 추가되기 전의 경기입니다. 자리별 젓기·동작 통계는 미수집입니다.</p>}
    <h3>동작 요청 결과</h3><p className="dev-muted">성공률 = 성공 ÷ (성공 + 시간 초과). 팀 동작은 두 자리에 중복 집계하지 않습니다.</p>
    {motion ? <MotionTable rows={motion} /> : <p className="dev-empty">동작 입력 소스가 없거나, 해당 기록이 없는 경기입니다.</p>}
    <h3>최종 결과</h3>{game.result ? <div className="dev-team-grid">{game.result.teams.map(t => <div className="dev-team" key={t.teamId}><b>{t.teamId}팀 · {t.result}</b><p>{duration(t.finishTimeMs)}</p><small>{game.result?.endReason}</small></div>)}</div> : <p className="dev-muted">종료 결과 수신 대기 중입니다. 연결 지연은 경기 종료를 의미하지 않습니다.</p>}
    {game.result && <><details><summary>아이템 사건 {game.result.itemEvents?.length ?? 0}건</summary><div className="dev-scroll"><table><thead><tr><th>시점</th><th>팀</th><th>아이템</th><th>결과</th></tr></thead><tbody>{game.result.itemEvents?.map(e => <tr key={e.id}><td>{duration(e.elapsedMs)}</td><td>{e.actorTeam}</td><td>{e.itemName}</td><td>{e.eventType}</td></tr>)}</tbody></table></div></details><details><summary>충돌 사건 {game.result.collisionEvents?.length ?? 0}건</summary><div className="dev-scroll"><table><thead><tr><th>시점</th><th>팀</th><th>종류</th><th>대상</th></tr></thead><tbody>{game.result.collisionEvents?.map(e => <tr key={e.id}><td>{duration(e.elapsedMs)}</td><td>{e.teamId}</td><td>{e.category === 'OBSTACLE' ? '장애물' : '지형'}</td><td>{e.targetName}</td></tr>)}</tbody></table></div></details></>}
    <p className="dev-note">젓기 수치는 게임이 받아들인 입력 횟수입니다. 실제 팔 왕복 횟수와 다르며, 기절·쿨다운에 따른 입력 거부는 인식 실패와 구분합니다.</p>
  </section>
}

export function DeveloperDashboard() {
  const { snapshot, logout } = useAuth()
  const account = snapshot?.status === 'AUTHENTICATED' ? snapshot.user?.userId : null
  const [query, setQuery] = useState('mode=CAMERA')
  const [page, setPage] = useState(0)
  const [listing, setListing] = useState<Listing | null>(null)
  const [selected, setSelected] = useState<{ userId: string; eventId: string } | null>(null)
  const [detail, setDetail] = useState<Game | null>(null)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [denied, setDenied] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController()
    // Reset when synchronizing a new account/query, before its first response.
    // oxlint-disable-next-line react/set-state-in-effect
    setListing(null); setError(''); setDenied(false)
    if (!account) return () => controller.abort()
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 3000); return }
      let delay = 3000
      try {
        const data = await developerGet(`${base}?${query}&offset=${page * 50}`, controller.signal).then(r => r.json()) as Listing
        if (!stopped) { setListing(data); setError(''); setDenied(false) }
      } catch (e) {
        if (stopped) return
        setError(errorMessage(e)); delay = 15000
        if (e instanceof ApiError && [401, 403].includes(e.status)) { setListing(null); setDetail(null); setDenied(true); return }
      }
      if (!stopped) timer = setTimeout(poll, delay)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [account, query, page, refresh])
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController()
    // oxlint-disable-next-line react/set-state-in-effect
    setDetail(null); setDetailError('')
    if (!selected || !account || denied) return () => controller.abort()
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 3000); return }
      let delay = 3000
      try { const game = await developerGet(`${base}/${selected!.userId}/${selected!.eventId}`, controller.signal).then(r => r.json()) as Game; if (!stopped) { setDetail(game); setDetailError('') } }
      catch (e) { if (stopped) return; setDetailError(errorMessage(e)); delay = 15000; if (e instanceof ApiError && [401, 403].includes(e.status)) { setDetail(null); return } }
      if (!stopped) timer = setTimeout(poll, delay)
    }
    void poll(); return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [selected, account, denied])
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const params = new URLSearchParams()
    for (const [key, value] of form.entries()) if (typeof value === 'string' && value) params.set(key, ['since', 'until'].includes(key) ? new Date(value).toISOString() : value.trim())
    setQuery(params.toString()); setPage(0); setSelected(null); setRefresh(n => n + 1)
  }
  async function download() {
    setExporting(true); setExportError('')
    try { const blob = await developerGet(`${base}.csv.zip?${query}`).then(r => r.blob()); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'gameplay-export.zip'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch (e) { setExportError(errorMessage(e)) } finally { setExporting(false) }
  }
  const stats = listing?.stats ?? []
  const telemetryGames = stats.reduce((n, s) => n + s.telemetryGames, 0)
  const totalStrokes = stats.reduce((n, s) => n + s.forward + s.backward, 0)
  const successes = stats.reduce((n, s) => n + s.recognized, 0), timeouts = stats.reduce((n, s) => n + s.timedOut, 0)
  return <div className="dev-dashboard"><header className="dev-top"><Link to="/">NODDSAY <span>개발자 센터</span></Link><span>{snapshot?.user?.displayName ?? ''} {account && <button onClick={() => void logout().catch(e => setError(errorMessage(e)))}>로그아웃</button>}</span></header>
    <div className="dev-content"><div className="dev-title"><div><p className="dev-eyebrow">PLAY INSIGHTS</p><h1>플레이를 보고, 더 나은 게임으로.</h1><p>실시간 경기와 동작 결과를 한곳에서 확인하세요.</p></div><div className="dev-update"><i className={error ? 'offline' : ''} />3초마다 갱신<br /><small>{listing ? `마지막 갱신 ${date(listing.serverTime)}` : '서버 연결 대기'}</small></div></div>
      {!snapshot ? <p className="dev-empty">로그인 상태 확인 중…</p> : !account ? <div className="dev-panel dev-empty"><p>개발자 계정으로 로그인해 주세요.</p><Link className="dev-button primary" to="/login">로그인</Link></div> : <>
        <form className="dev-filters dev-panel" onSubmit={filter}><label>시작 시각<input type="datetime-local" name="since" /></label><label>종료 시각<input type="datetime-local" name="until" /></label><label>맵<select name="mapId"><option value="">모든 맵</option><option value="tropical-river">포세이돈의 물장난</option><option value="desert-oasis">사막</option></select></label><label>빌드 버전<input name="version" placeholder="모든 버전" maxLength={128} /></label><label>입력<select name="mode" defaultValue="CAMERA"><option value="CAMERA">카메라</option><option value="">모든 입력</option><option value="KEYBOARD">키보드</option><option value="AUTOMATED_TEST">자동 검증</option></select></label><label>경기 상태<select name="state"><option value="">모든 상태</option>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><button className="dev-button primary" type="submit">조건 적용</button></form>
        <p className="dev-muted dev-filter-note">기간을 지정하지 않으면 최근 7일을 조회합니다. 기본 통계는 카메라 플레이입니다.</p>
        {error && <div className="dev-alert" role="alert">{error} <button className="dev-button" onClick={() => setRefresh(n => n + 1)}>다시 확인</button></div>}
        {listing && !denied && <><div className="dev-metrics"><article><span>진행 중 경기</span><strong>{count(listing.activeCount)}<small>판</small></strong><p>현재 조회 조건 · 일시정지 포함</p></article><article><span>조회된 경기</span><strong>{count(listing.total)}<small>판</small></strong><p>종료·연결 지연 포함</p></article><article><span>적용된 젓기</span><strong>{telemetryGames ? count(totalStrokes) : '—'}<small>{telemetryGames ? '회' : ''}</small></strong><p>계측 {telemetryGames} / {listing.total}경기 · 자리별 합계</p></article><article><span>동작 요청 성공률</span><strong>{successes + timeouts ? (100 * successes / (successes + timeouts)).toFixed(1) : '—'}<small>{successes + timeouts ? '%' : ''}</small></strong><p>성공 {successes} · 시간 초과 {timeouts}</p></article></div>
          <section className="dev-panel"><div className="dev-panel-heading"><div><h2>경기 현황</h2><p className="dev-muted">15초 이상 소식이 없으면 연결 확인이 필요합니다.</p></div><button className="dev-button primary" onClick={() => void download()} disabled={exporting}>{exporting ? '내보내는 중…' : '조회 조건으로 CSV 내보내기'}</button></div>{exportError && <p role="alert" className="dev-alert">{exportError}</p>}<div className="dev-scroll"><table><thead><tr><th>상태</th><th>맵 / 경기</th><th>시작 시각</th><th>경과 시간</th><th>입력 / 빌드</th><th>마지막 수신</th><th /></tr></thead><tbody>{listing.games.map(g => <tr key={`${g.userId}-${g.eventId}`} className={selected?.eventId === g.eventId && selected.userId === g.userId ? 'selected' : ''}><td><Badge state={g.state} /></td><td><b>{g.mapName}</b><small>{g.eventId.slice(0, 8)}</small></td><td>{date(g.startedAt)}</td><td>{duration(g.elapsedMs)}</td><td>{modes[g.inputMode]}<small>{g.clientVersion}</small></td><td>{date(g.receivedAt)}</td><td><button className="dev-button" onClick={() => setSelected({ userId: g.userId, eventId: g.eventId })}>상세 보기</button></td></tr>)}</tbody></table></div>{listing.total === 0 && <p className="dev-empty">조건에 맞는 경기가 없습니다.</p>}<div className="dev-pages"><button className="dev-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1} / {Math.max(1, Math.ceil(listing.total / 50))}</span><button className="dev-button" disabled={(page + 1) * 50 >= listing.total} onClick={() => setPage(p => p + 1)}>다음</button></div></section>
          {detailError && <p className="dev-alert" role="alert">{detailError}</p>}{selected && !detail && !detailError && <p className="dev-empty">경기 상세 불러오는 중…</p>}{detail && <Detail game={detail} close={() => setSelected(null)} />}
          <section className="dev-panel"><div className="dev-panel-heading"><div><h2>맵 · 버전별 비교</h2><p className="dev-muted">완주율은 종료 경기의 팀 기준입니다. 미완주는 평균 완주 시간에서 제외합니다.</p></div></div><div className="dev-scroll"><table><thead><tr><th>맵</th><th>맵 / 빌드 버전</th><th>경기</th><th>팀 완주율</th><th>평균 완주 시간</th><th>전진 / 후진</th><th>동작 성공 / 시간 초과</th></tr></thead><tbody>{stats.map((s, i) => <tr key={i}><td>{s.mapName}</td><td>{s.mapVersion} / {s.clientVersion}</td><td>{s.games}</td><td>{s.totalTeams ? `${(100 * s.finishedTeams / s.totalTeams).toFixed(1)}% (${s.finishedTeams}/${s.totalTeams})` : '—'}</td><td>{s.averageFinishMs == null ? '—' : duration(s.averageFinishMs)}</td><td>{s.telemetryGames ? `${count(s.forward)} / ${count(s.backward)}` : '미수집'}</td><td>{s.motionGames ? `${s.recognized} / ${s.timedOut}` : '미수집'}</td></tr>)}</tbody></table></div></section>
          <p className="dev-note">CSV ZIP에는 경기·팀 결과·자리별 젓기·동작 요청·아이템·충돌·규칙 7종과 조회 조건이 포함됩니다. 이전 경기의 미수집 수치는 0으로 채우지 않습니다.</p>
        </>}{!listing && !error && <p className="dev-empty">경기 데이터를 불러오는 중…</p>}
      </>}
    </div>
  </div>
}
