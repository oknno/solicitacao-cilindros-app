import "./SplashScreen.css";

type SplashScreenProps = {
  isExiting?: boolean;
};

export function SplashScreen({ isExiting = false }: SplashScreenProps) {
  return (
    <section
      aria-label="Tela de abertura do sistema"
      className={`capex-splash${isExiting ? " capex-splash--exit" : ""}`}
      role="status"
    >
      <div className="capex-splash__content">
        <div className="capex-splash__brand" aria-label="ArcelorMittal">
          {/* Assets opcionais adicionados manualmente depois:
              logo: src/assets/branding/arcelormittal-logo.svg
              imagem: src/assets/splash/splash-building.webp
              Não importamos esses arquivos aqui para manter o build funcionando sem assets binários. */}
          ArcelorMittal
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
        {/* Fallback visual em CSS. A imagem corporativa real poderá substituir esta área
            quando src/assets/splash/splash-building.webp for adicionada manualmente. */}
        <div className="capex-splash__visualFrame">
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
