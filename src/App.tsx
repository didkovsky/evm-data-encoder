import { Interface } from 'ethers'
import { useMemo, useState } from 'react'
import './App.css'

type ParamRow = {
  id: string
  type: string
  value: string
}

type Preset = {
  id: string
  label: string
  signature: string
  paramTypes: string[]
}

const PRESETS: Preset[] = [
  {
    id: 'erc20_transfer',
    label: 'ERC20: transfer(address to, uint256 amount)',
    signature: 'transfer(address,uint256)',
    paramTypes: ['address', 'uint256'],
  },
  {
    id: 'erc20_approve',
    label: 'ERC20: approve(address spender, uint256 amount)',
    signature: 'approve(address,uint256)',
    paramTypes: ['address', 'uint256'],
  },
  {
    id: 'erc20_transferFrom',
    label: 'ERC20: transferFrom(address from, address to, uint256 amount)',
    signature: 'transferFrom(address,address,uint256)',
    paramTypes: ['address', 'address', 'uint256'],
  },
  {
    id: 'custom',
    label: 'Custom',
    signature: 'myMethod(uint256)',
    paramTypes: ['uint256'],
  },
]

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`
}

function tryParseValue(type: string, raw: string) {
  const t = type.trim()
  const v = raw.trim()

  // arrays: user provides JSON, e.g. ["0x..", "0x.."] or [1,2,3]
  if (t.endsWith(']')) {
    return JSON.parse(v)
  }

  if (t === 'bool') {
    if (v.toLowerCase() === 'true') return true
    if (v.toLowerCase() === 'false') return false
    throw new Error('bool must be true/false')
  }

  // ethers accepts numbers as decimal strings for uint/int
  if (t.startsWith('uint') || t.startsWith('int')) return v

  // address/bytes/string can stay as string; bytes should be 0x-prefixed
  return v
}

function App() {
  const [presetId, setPresetId] = useState<string>(PRESETS[0]!.id)
  const [signature, setSignature] = useState<string>(PRESETS[0]!.signature)
  const [params, setParams] = useState<ParamRow[]>(
    PRESETS[0]!.paramTypes.map((t) => ({ id: randomId(), type: t, value: '' })),
  )
  const [calldata, setCalldata] = useState<string>('')
  const [error, setError] = useState<string>('')

  const isCustom = presetId === 'custom'

  const iface = useMemo(() => {
    const sig = signature.trim()
    if (!sig) return null
    try {
      return new Interface([`function ${sig}`])
    } catch {
      return null
    }
  }, [signature])

  const functionName = useMemo(() => {
    const s = signature.trim()
    const i = s.indexOf('(')
    if (i <= 0) return ''
    return s.slice(0, i).trim()
  }, [signature])

  function applyPreset(nextId: string) {
    const preset = PRESETS.find((p) => p.id === nextId) ?? PRESETS[0]!
    setPresetId(preset.id)
    setSignature(preset.signature)
    setParams(preset.paramTypes.map((t) => ({ id: randomId(), type: t, value: '' })))
    setCalldata('')
    setError('')
  }

  function onGenerate() {
    setError('')
    setCalldata('')

    const sig = signature.trim()
    if (!sig) {
      setError('Method signature is required (example: transfer(address,uint256)).')
      return
    }
    if (!iface) {
      setError('Invalid method signature. Example: approve(address,uint256)')
      return
    }
    if (!functionName) {
      setError('Invalid method name in signature.')
      return
    }

    try {
      const values = params.map((p, idx) => {
        if (!p.type.trim()) throw new Error(`Param #${idx + 1}: type is required`)
        if (!p.value.trim()) throw new Error(`Param #${idx + 1}: value is required`)
        return tryParseValue(p.type, p.value)
      })

      const data = iface.encodeFunctionData(functionName, values)
      setCalldata(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <div className="title">EVM Calldata Encoder</div>
            <div className="subtitle">Encode smart contract function calls (ABI)</div>
          </div>
        </div>
      </header>

      <main className="card">
        <div className="row">
          <label className="label">
            Preset
            <select
              className="select"
              value={presetId}
              onChange={(e) => applyPreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="label">
            Method signature
            <input
              className="input"
              value={signature}
              onChange={(e) => {
                setSignature(e.target.value)
                setCalldata('')
                setError('')
              }}
              placeholder="approve(address,uint256)"
              spellCheck={false}
              inputMode="text"
            />
          </label>
        </div>

        <section className="params">
          <div className="paramsHeader">
            <div className="paramsTitle">Parameters</div>
            <div className="paramsActions">
              <button
                className="btn secondary"
                type="button"
                onClick={() =>
                  setParams((prev) => [...prev, { id: randomId(), type: 'uint256', value: '' }])
                }
                disabled={!isCustom}
                title={!isCustom ? 'Switch to Custom to edit parameter list' : undefined}
              >
                Add parameter
              </button>
            </div>
          </div>

          <div className="paramGrid">
            <div className="paramGridHead">Type</div>
            <div className="paramGridHead">Value</div>
            <div className="paramGridHead" aria-hidden="true" />

            {params.map((p, idx) => (
              <div className="paramRow" key={p.id}>
                <input
                  className="input mono"
                  value={p.type}
                  onChange={(e) =>
                    setParams((prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, type: e.target.value } : x)),
                    )
                  }
                  disabled={!isCustom}
                  placeholder="address | uint256 | bool | bytes32 | uint256[]"
                  spellCheck={false}
                />
                <input
                  className="input mono"
                  value={p.value}
                  onChange={(e) =>
                    setParams((prev) =>
                      prev.map((x) => (x.id === p.id ? { ...x, value: e.target.value } : x)),
                    )
                  }
                  placeholder={idx === 0 ? '0x… or 123 or true' : 'value'}
                  spellCheck={false}
                />
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => setParams((prev) => prev.filter((x) => x.id !== p.id))}
                  disabled={!isCustom || params.length <= 1}
                  title={!isCustom ? 'Switch to Custom to edit parameter list' : 'Remove parameter'}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="hint">
            Arrays: provide JSON (example: <span className="mono">[1,2,3]</span> or{' '}
            <span className="mono">["0x…","0x…"]</span>). For uint/int, use decimal strings.
          </div>
        </section>

        <div className="footerRow">
          <button className="btn primary" type="button" onClick={onGenerate}>
            Generate calldata
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={async () => {
              if (!calldata) return
              await navigator.clipboard.writeText(calldata)
            }}
            disabled={!calldata}
          >
            Copy
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <section className="output">
          <div className="outputHeader">
            <div className="paramsTitle">Calldata</div>
            <div className="chip">{functionName ? `${functionName}()` : '—'}</div>
          </div>
          <textarea
            className="textarea mono"
            value={calldata}
            readOnly
            placeholder="0x…"
            spellCheck={false}
          />
        </section>
      </main>

      <footer className="footer">
        Built with <span className="mono">ethers</span> · Works offline · No RPC required
      </footer>
    </div>
  )
}

export default App
