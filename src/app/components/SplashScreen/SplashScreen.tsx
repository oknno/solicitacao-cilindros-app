import { useEffect, useState } from "react";
import arcelorMittalLogo from "../../../assets/branding/arcelormittal-logo.svg";
import splashBuilding from "../../../assets/splash/splash-building.webp";
import "./SplashScreen.css";

type SplashScreenProps = {
  onExitStart: () => void;
  onFinish: () => void;
};

const splashDurationInMs = 3000;
const splashExitDurationInMs = 560;

export function SplashScreen({ onExitStart, onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [hasLogoError, setHasLogoError] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
      onExitStart();
    }, splashDurationInMs);

    const finishTimer = window.setTimeout(() => {
      onFinish();
    }, splashDurationInMs + splashExitDurationInMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [onExitStart, onFinish]);

  return (
    <section
      aria-label="Tela de abertura do sistema"
      className={`capex-splash${isExiting ? " capex-splash--exit" : ""}${
        hasImageError ? " capex-splash--imageFallback" : ""
      }`}
      role="status"
    >
      <div className="capex-splash__content">
        <div className="capex-splash__brand" aria-label="ArcelorMittal">
          {hasLogoError ? (
            <span className="capex-splash__brandFallback">ArcelorMittal</span>
          ) : (
            <img
              src={arcelorMittalLogo}
              alt="ArcelorMittal"
              className="capex-splash__logo"
              onError={() => setHasLogoError(true)}
            />
          )}
        </div>

        <div className="capex-splash__titleBlock">
          <p className="capex-splash__eyebrow">Sistema corporativo</p>
          <h1>Solicitação de Material</h1>
          <p>Cilindros e Discos</p>
          <div className="capex-splash__progress" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>

      <div className="capex-splash__visual" aria-hidden="true">
        <div className="capex-splash__visualFrame">
          {!hasImageError ? (
            <img
              src={splashBuilding}
              alt=""
              aria-hidden="true"
              className="capex-splash__image"
              onError={() => setHasImageError(true)}
            />
          ) : null}
          <span className="capex-splash__curve capex-splash__curve--one" />
          <span className="capex-splash__curve capex-splash__curve--two" />
          <span className="capex-splash__curve capex-splash__curve--three" />
          <span className="capex-splash__line capex-splash__line--one" />
          <span className="capex-splash__line capex-splash__line--two" />
        </div>
      </div>

      <p className="capex-splash__credits">Desenvolvido por Gerência de CAPEX</p>
    </section>
  );
}
