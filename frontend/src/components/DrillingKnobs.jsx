const PARAM_META = {
  depth:    { label: 'Hole Depth',          unit: 'm',     min: 300,   max: 6000,  step: 10   },
  wob:      { label: 'Weight on Bit',       unit: 'kkgf',  min: 0,     max: 120,   step: 0.5  },
  rop:      { label: 'Rate of Penetration', unit: 'm/h',   min: 0,     max: 100,   step: 0.5  },
  torque:   { label: 'Surface Torque',      unit: 'kN.m',  min: 0,     max: 40,    step: 0.1  },
  hookload: { label: 'Hookload',            unit: 'kkgf',  min: 0,     max: 300,   step: 1    },
  mud_in:   { label: 'Mud Density In',      unit: 'g/cm³', min: 0.9,   max: 2.5,   step: 0.01 },
  spp:      { label: 'Standpipe Pressure',  unit: 'kPa',   min: 0,     max: 35000, step: 100  },
  shock:    { label: 'MWD Shock Peak',      unit: 'm/s²',  min: 0,     max: 200,   step: 1    },
  gas:      { label: 'Gas Average',         unit: '%',     min: 0,     max: 100,   step: 0.1  },
  rpm:      { label: 'Rotary Speed',        unit: 'rpm',   min: 0,     max: 200,   step: 1    },
};

function formatVal(key, val) {
  if (key === 'spp') return val.toLocaleString();
  if (key === 'mud_in') return val.toFixed(2);
  if (key === 'torque') return val.toFixed(1);
  if (key === 'gas')    return val.toFixed(1);
  return val;
}

export default function DrillingKnobs({ params, onChange }) {
  return (
    <div className="knobs-grid">
      {Object.entries(PARAM_META).map(([key, meta]) => {
        const val = params[key] ?? meta.min;
        const pct = Math.min(Math.max(((val - meta.min) / (meta.max - meta.min)) * 100, 0), 100);

        return (
          <div key={key} className="knob-row">
            <div className="knob-row__header">
              <span className="knob-row__label">{meta.label}</span>
              <span className="knob-row__value">
                {formatVal(key, val)}
                <span className="knob-row__unit">{meta.unit}</span>
              </span>
            </div>
            <input
              type="range"
              className="slider"
              min={meta.min}
              max={meta.max}
              step={meta.step}
              value={val}
              onChange={(e) => onChange(key, parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--blue) ${pct}%, #e2e8f0 ${pct}%)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
