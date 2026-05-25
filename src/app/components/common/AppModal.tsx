import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "../ui/Button";
import { wizardLayoutStyles as styles } from "../../pages/ProjectsPage/components/wizard/wizardLayoutStyles";
import { uiTokens } from "../ui/tokens";
export function AppModal({ title, subtitle, onClose, actions, children }: PropsWithChildren<{title:string; subtitle?:string; onClose:()=>void; actions?:ReactNode;}>) {return <div style={styles.overlay}><div style={styles.modal}><div style={styles.modalHeader}><div><div style={{fontSize:14,fontWeight:800,color:uiTokens.colors.textStrong}}>{title}</div>{subtitle&&<div style={{fontSize:12,color:uiTokens.colors.textMuted,marginTop:2}}>{subtitle}</div>}</div><Button onClick={onClose}>Fechar</Button></div><div style={styles.body}>{children}</div>{actions&&<div style={styles.footer}>{actions}</div>}</div></div>;}
