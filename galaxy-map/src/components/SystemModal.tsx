import { useEffect, useState } from "react";
import {
  COMMODITY_LABELS,
  COMMODITY_ORDER,
  decodeCommodityPrices,
  tierDisplay,
} from "../commodityPrices";
import { govtDisplayName } from "../govtDisplay";
import type { GalaxyJSONDocument, GalaxySpobDetail, GalaxySystem } from "../galaxyTypes";
import { describeSpobFlags } from "../spobFlags";
import styles from "./SystemModal.module.css";
import { SystemMapSvg } from "./SystemMapSvg";

type DetailState = { kind: "overview" } | { kind: "spob"; spobId: number };

function SystemOverview({
  system,
  doc,
}: {
  system: GalaxySystem;
  doc: GalaxyJSONDocument;
}) {
  const e = system.environment;
  const govtLine = govtDisplayName(doc, e?.govt);
  return (
    <>
      <h3 className={styles.h3}>System</h3>
      <p className={styles.meta}>
        Galaxy coordinates ({system.x}, {system.y}) · id <code>{system.id}</code>
      </p>
      <p className={styles.meta}>
        <strong>Government:</strong> {govtLine}
      </p>
      <p className={styles.meta}>
        <strong>Hyperlinks:</strong> {system.links.length ? system.links.join(", ") : "—"}
      </p>
      {e ? (
        <table className={styles.table}>
          <tbody>
            <tr>
              <th>Avg ships</th>
              <td>{e.avgShips}</td>
            </tr>
            <tr>
              <th>Asteroids</th>
              <td>{e.asteroids}</td>
            </tr>
            <tr>
              <th>Interference</th>
              <td>{e.interference}</td>
            </tr>
            <tr>
              <th>Message buoy</th>
              <td>{e.messageBuoy}</td>
            </tr>
            <tr>
              <th>Dude / fleet slots</th>
              <td>
                <code>{e.dudeTypes.join(", ")}</code>
              </td>
            </tr>
            <tr>
              <th>Presence %</th>
              <td>
                <code>{e.shipPresenceProb.join(", ")}</code>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className={styles.meta}>No extended system block in export.</p>
      )}
      <p className={`${styles.placeholder} ${styles.pbtm}`}>
        Click a planet or station on the map for spöb data.
      </p>
    </>
  );
}

function SpobDetail({
  spobId,
  doc,
}: {
  spobId: number;
  doc: GalaxyJSONDocument;
}) {
  const full: GalaxySpobDetail | undefined = doc.stellarsById[String(spobId)];
  const sysSt = doc.systems.flatMap((s) => s.stellars).find((x) => x.spobId === spobId);

  if (!full && !sysSt) {
    return <p className={styles.placeholder}>No spöb data.</p>;
  }

  const name = full?.name ?? sysSt?.name ?? `spöb ${spobId}`;
  const lx = full?.localX ?? sysSt?.localX ?? 0;
  const ly = full?.localY ?? sysSt?.localY ?? 0;
  const spin = full?.spinRaw ?? sysSt?.spinRaw ?? 0;
  const spinId = spin + 1000;

  const prices = decodeCommodityPrices(full?.flags);
  const flags = describeSpobFlags(full?.flags);
  const spec = full?.specialTech?.filter((v) => v !== 0 && v !== -1) ?? [];
  const defRaw = full?.defenseFleetRaw;
  const defHint =
    defRaw !== undefined && defRaw >= 1000 ? (
      <span className={styles.meta}>(wave-encoded in plug-in)</span>
    ) : null;
  const spobGovt = full?.govt !== undefined ? govtDisplayName(doc, full.govt) : "—";

  return (
    <>
      <h3 className={styles.h3}>{name}</h3>
      <p className={styles.meta}>
        Resource id <code>{spobId}</code> · in-system ({lx}, {ly})
      </p>
      {prices !== undefined ? (
        <>
          <h4 className={styles.h4}>Commodity prices</h4>
          <table className={styles.table}>
            <tbody>
              {COMMODITY_ORDER.map((k) => (
                <tr key={k}>
                  <th>{COMMODITY_LABELS[k]}</th>
                  <td>{tierDisplay(prices[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
      <h4 className={styles.h4}>Stellar object</h4>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Graphics type</th>
            <td>
              <code>{spin}</code> → spïn id <code>{spinId}</code>
            </td>
          </tr>
          <tr>
            <th>Government</th>
            <td>{spobGovt}</td>
          </tr>
          {full?.flags !== undefined ? (
            <tr>
              <th>Flags</th>
              <td>
                <code>0x{(full.flags >>> 0).toString(16)}</code>
              </td>
            </tr>
          ) : null}
          {full?.tribute !== undefined ? (
            <tr>
              <th>Tribute</th>
              <td>{full.tribute}</td>
            </tr>
          ) : null}
          {full?.techLevel !== undefined ? (
            <tr>
              <th>Tech level</th>
              <td>{full.techLevel}</td>
            </tr>
          ) : null}
          {full?.minLanding !== undefined ? (
            <tr>
              <th>Min landing (record)</th>
              <td>{full.minLanding}</td>
            </tr>
          ) : null}
          {full?.custPicId !== undefined ? (
            <tr>
              <th>Custom PICT</th>
              <td>{full.custPicId}</td>
            </tr>
          ) : null}
          {full?.custSndId !== undefined ? (
            <tr>
              <th>Ambient snd / angle</th>
              <td>{full.custSndId}</td>
            </tr>
          ) : null}
          {full?.defenseDude !== undefined ? (
            <tr>
              <th>Defense dude</th>
              <td>{full.defenseDude}</td>
            </tr>
          ) : null}
          {defRaw !== undefined ? (
            <tr>
              <th>Defense fleet (raw)</th>
              <td>
                <code>{defRaw}</code>
                {defHint}
              </td>
            </tr>
          ) : null}
          {spec.length > 0 ? (
            <tr>
              <th>Special tech</th>
              <td>
                <code>{spec.join(", ")}</code>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {full?.flags !== undefined && flags.length > 0 ? (
        <div>
          <strong>Other flags</strong>
          <ul className={styles.flags}>
            {flags.map((t, i) => (
              <li key={`${i}-${t}`}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export type SystemModalProps = {
  open: boolean;
  doc: GalaxyJSONDocument | null;
  system: GalaxySystem | null;
  onClose: () => void;
};

export function SystemModal({ open, doc, system, onClose }: SystemModalProps) {
  const [detail, setDetail] = useState<DetailState>({ kind: "overview" });

  useEffect(() => {
    if (!open) return;
    setDetail({ kind: "overview" });
  }, [open, system?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !doc || !system) return null;

  const sub = govtDisplayName(doc, system.environment?.govt);

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} role="presentation" onClick={onClose} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-modal-title"
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="system-modal-title" className={styles.title}>
          {system.name || `System ${system.id}`}
        </h2>
        <p className={styles.sub}>{sub}</p>
        <div className={styles.split}>
          <div className={styles.mapCol}>
            <p className={styles.mapHint}>
              Drag to pan, wheel to zoom. Click a body to select; click empty space for system info.
            </p>
            <div className={styles.mapShell}>
              {system.stellars.length > 0 ? (
                <SystemMapSvg
                  system={system}
                  selectedSpobId={detail.kind === "spob" ? detail.spobId : null}
                  onSelectSpob={(spobId) => setDetail({ kind: "spob", spobId })}
                  onDeselect={() => setDetail({ kind: "overview" })}
                />
              ) : (
                <p className={styles.placeholder}>No nav-default stellars in this export.</p>
              )}
            </div>
          </div>
          <div className={styles.detailCol}>
            {detail.kind === "overview" ? (
              <SystemOverview system={system} doc={doc} />
            ) : (
              <SpobDetail spobId={detail.spobId} doc={doc} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
