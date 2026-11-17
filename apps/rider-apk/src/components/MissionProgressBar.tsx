import React from 'react';

export interface MissionProgressBarProps {
  currentStep: 1 | 2 | 3 | 4;
  stepTitle?: string;
  etaText?: string;
}

export const MissionProgressBar: React.FC<MissionProgressBarProps> = ({
  currentStep,
  stepTitle,
  etaText,
}) => {
  return (
    <div data-testid="mission-progress-bar">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
          fontSize: '11px',
          fontWeight: 800,
          color: 'var(--accent-orange)',
        }}
      >
        <span id="missionStepTitle" data-testid="mission-step-title">
          {stepTitle || `Step ${currentStep} of 4`}
        </span>
        {etaText && (
          <span
            id="missionEtaText"
            className="tabular-num"
            data-testid="mission-eta-text"
          >
            {etaText}
          </span>
        )}
      </div>

      <div className="stepper-4-track" data-testid="stepper-4-track">
        <div
          id="mSeg1"
          className={`step-bar-seg ${currentStep > 1 ? 'done' : currentStep === 1 ? 'active' : ''}`}
          data-testid="step-seg-1"
        />
        <div
          id="mSeg2"
          className={`step-bar-seg ${currentStep > 2 ? 'done' : currentStep === 2 ? 'active' : ''}`}
          data-testid="step-seg-2"
        />
        <div
          id="mSeg3"
          className={`step-bar-seg ${currentStep > 3 ? 'done' : currentStep === 3 ? 'active' : ''}`}
          data-testid="step-seg-3"
        />
        <div
          id="mSeg4"
          className={`step-bar-seg ${currentStep >= 4 ? 'active' : ''}`}
          data-testid="step-seg-4"
        />
      </div>
    </div>
  );
};

export default MissionProgressBar;
