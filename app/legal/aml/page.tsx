import { LegalShell, type LegalContent } from '../_components/LegalShell'

const en: LegalContent = {
  title: 'AML / CFT Policy',
  subtitle: 'Compliance',
  sections: [
    {
      id: 'intro',
      title: '1. Introduction & Legal Framework',
      paragraphs: [
        'Convexo SAS ("Convexo") maintains a robust Anti-Money Laundering (AML) and Counter-Financing of Terrorism (CFT) compliance program in accordance with applicable Colombian law, including Law 526 of 1999, Law 1121 of 2006, SARLAFT (Sistema de Administración del Riesgo de Lavado de Activos y de la Financiación del Terrorismo) regulations issued by the Superintendencia Financiera de Colombia, and the recommendations of the Financial Action Task Force (FATF).',
        'This policy applies to all users, transactions, and operations conducted through the Convexo platform. All users are required to comply with the obligations set forth in this policy as a condition of accessing our services.',
        'Convexo is committed to preventing its platform from being used, directly or indirectly, for the purpose of money laundering, terrorist financing, or any other form of financial crime.',
      ],
    },
    {
      id: 'kyc',
      title: '2. Know Your Customer (KYC)',
      paragraphs: [
        'All users must complete a mandatory identity verification process before gaining full access to the Convexo platform. This process includes: submission of a valid government-issued photo identification document (Cédula de Ciudadanía, Cédula de Extranjería, or Passport); submission of a valid RUT (Registro Único Tributario) certificate issued by the DIAN, dated no more than one month prior to registration; and provision of basic personal and business information.',
        'For corporate users, additional documentation may be required, including: certificate of existence and legal representation (Certificado de Existencia y Representación Legal), identity documents of beneficial owners holding 25% or more of the entity, and description of business activities and expected transaction volumes.',
        'Convexo reserves the right to request additional documentation at any time and to refuse or suspend access if verification requirements cannot be satisfied.',
      ],
    },
    {
      id: 'cdd',
      title: '3. Customer Due Diligence (CDD)',
      paragraphs: [
        'Convexo applies a risk-based approach to customer due diligence. All customers are assessed at onboarding and periodically thereafter. Risk classification considers factors such as: geographic origin and counterparty locations, nature and volume of expected transactions, source of funds and wealth, industry sector, and politically exposed person (PEP) status.',
        'Enhanced Due Diligence (EDD) is applied to customers classified as higher risk, including PEPs and their close associates, users whose transactions present unusual patterns, and users from jurisdictions identified as high-risk by the FATF. EDD may include additional documentation, senior management approval, and increased monitoring frequency.',
        'Simplified Due Diligence may apply to low-risk users with demonstrably low transaction volumes and exposure, subject to internal compliance review.',
      ],
    },
    {
      id: 'monitoring',
      title: '4. Transaction Monitoring',
      paragraphs: [
        'Convexo monitors all transactions on the platform on an ongoing basis to detect potentially suspicious activity. Monitoring criteria include, but are not limited to: transactions inconsistent with a user\'s stated business purpose or profile; unusual transaction volumes, frequencies, or patterns; transactions involving jurisdictions subject to international sanctions; structuring of transactions designed to avoid reporting thresholds; and sudden changes in transaction behavior without a plausible business explanation.',
        'Our compliance team reviews flagged transactions promptly. Where a transaction cannot be satisfactorily explained, Convexo may delay, suspend, or decline the transaction pending further review.',
      ],
    },
    {
      id: 'sar',
      title: '5. Suspicious Activity Reporting',
      paragraphs: [
        'In the event that Convexo identifies a transaction or pattern of behavior that raises reasonable suspicion of money laundering, terrorist financing, or other financial crime, we are legally obligated to file a Suspicious Activity Report (SAR/REPORTE DE OPERACIÓN SOSPECHOSA) with the Unidad de Información y Análisis Financiero (UIAF) of Colombia without notifying the affected user ("tipping off" prohibition).',
        'Our compliance team is trained to identify and escalate suspicious activity. All reports are handled with strict confidentiality in accordance with applicable law.',
      ],
    },
    {
      id: 'sanctions',
      title: '6. Sanctions Screening',
      paragraphs: [
        'Convexo screens all users and transactions against applicable sanctions lists, including: the OFAC (Office of Foreign Assets Control) Specially Designated Nationals (SDN) list; the UN Security Council consolidated sanctions list; the EU consolidated sanctions list; and the OFAC list of sanctioned countries and regions.',
        'Any user or transaction matching a sanctions entry will be blocked immediately and referred to our compliance team for review. Convexo will not process transactions that would violate applicable sanctions laws under any circumstances.',
      ],
    },
    {
      id: 'records',
      title: '7. Record Keeping',
      paragraphs: [
        'Convexo retains all KYC documentation, transaction records, due diligence findings, and compliance reports for a minimum of five (5) years from the date of the last transaction or account closure, whichever is later, in accordance with Colombian AML regulations and FATF Recommendation 11.',
        'All records are stored securely and are available to competent authorities upon lawful request.',
      ],
    },
    {
      id: 'pep',
      title: '8. Politically Exposed Persons (PEPs)',
      paragraphs: [
        'Convexo identifies and applies enhanced scrutiny to Politically Exposed Persons (PEPs), defined as individuals who hold or have held prominent public positions, as well as their immediate family members and known close associates.',
        'Onboarding of PEPs requires senior management approval and is subject to Enhanced Due Diligence procedures. PEP status is assessed at registration and monitored on an ongoing basis.',
      ],
    },
    {
      id: 'training',
      title: '9. Training & Internal Controls',
      paragraphs: [
        'Convexo maintains internal AML/CFT controls including a designated Compliance Officer responsible for the implementation and oversight of this policy, regular staff training on AML/CFT obligations and red flag recognition, and independent periodic reviews of the compliance program.',
        'Employees and contractors are required to report any suspected AML/CFT concerns to the Compliance Officer and are protected from retaliation for making good-faith reports.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contact & Reporting',
      paragraphs: [
        'For compliance-related inquiries, or to report a concern regarding a potential AML/CFT matter, please contact our Compliance team at: compliance@convexo.xyz.',
        'This policy is reviewed and updated at least annually, or whenever there are material changes in applicable law or regulatory guidance.',
      ],
    },
  ],
}

const es: LegalContent = {
  title: 'Política AML / SARLAFT',
  subtitle: 'Cumplimiento',
  sections: [
    {
      id: 'intro',
      title: '1. Introducción y Marco Legal',
      paragraphs: [
        'Convexo SAS ("Convexo") mantiene un sólido programa de cumplimiento Anti-Lavado de Activos (ALA) y Contra la Financiación del Terrorismo (CFT), de acuerdo con la legislación colombiana aplicable, incluyendo la Ley 526 de 1999, la Ley 1121 de 2006, las regulaciones del SARLAFT (Sistema de Administración del Riesgo de Lavado de Activos y de la Financiación del Terrorismo) emitidas por la Superintendencia Financiera de Colombia, y las recomendaciones del Grupo de Acción Financiera Internacional (GAFI).',
        'Esta política aplica a todos los usuarios, transacciones y operaciones realizadas a través de la plataforma Convexo. Todos los usuarios están obligados a cumplir con las obligaciones establecidas en esta política como condición para acceder a nuestros servicios.',
        'Convexo está comprometida a evitar que su plataforma sea utilizada, directa o indirectamente, para el lavado de activos, la financiación del terrorismo o cualquier otra forma de delito financiero.',
      ],
    },
    {
      id: 'kyc',
      title: '2. Conocimiento del Cliente (KYC)',
      paragraphs: [
        'Todos los usuarios deben completar un proceso obligatorio de verificación de identidad antes de obtener acceso completo a la plataforma Convexo. Este proceso incluye: presentación de un documento de identificación válido expedido por el gobierno (Cédula de Ciudadanía, Cédula de Extranjería o Pasaporte); presentación de un certificado de RUT válido expedido por la DIAN, con fecha no mayor a un mes anterior al registro; y suministro de información personal y empresarial básica.',
        'Para usuarios corporativos, se puede requerir documentación adicional, incluyendo: Certificado de Existencia y Representación Legal, documentos de identidad de beneficiarios finales con participación igual o superior al 25%, y descripción de las actividades empresariales y los volúmenes de transacciones esperados.',
        'Convexo se reserva el derecho de solicitar documentación adicional en cualquier momento y de rechazar o suspender el acceso si no se pueden satisfacer los requisitos de verificación.',
      ],
    },
    {
      id: 'cdd',
      title: '3. Debida Diligencia del Cliente (DDC)',
      paragraphs: [
        'Convexo aplica un enfoque basado en riesgo para la debida diligencia del cliente. Todos los clientes son evaluados al momento del onboarding y periódicamente después. La clasificación de riesgo considera factores como: origen geográfico y ubicaciones de las contrapartes, naturaleza y volumen de las transacciones esperadas, fuente de fondos y patrimonio, sector industrial, y condición de Persona Expuesta Políticamente (PEP).',
        'Se aplica Debida Diligencia Ampliada (DDA) a clientes clasificados como de mayor riesgo, incluyendo PEPs y sus asociados cercanos, usuarios cuyas transacciones presentan patrones inusuales, y usuarios de jurisdicciones identificadas como de alto riesgo por el GAFI. La DDA puede incluir documentación adicional, aprobación de la alta dirección y mayor frecuencia de monitoreo.',
        'La Debida Diligencia Simplificada puede aplicarse a usuarios de bajo riesgo con volúmenes de transacción demostrablemente bajos, sujeto a revisión del equipo de cumplimiento.',
      ],
    },
    {
      id: 'monitoring',
      title: '4. Monitoreo de Transacciones',
      paragraphs: [
        'Convexo monitorea todas las transacciones de la plataforma de manera continua para detectar actividades potencialmente sospechosas. Los criterios de monitoreo incluyen, entre otros: transacciones inconsistentes con el propósito comercial declarado del usuario; volúmenes, frecuencias o patrones de transacciones inusuales; transacciones que involucren jurisdicciones sujetas a sanciones internacionales; estructuración de transacciones diseñadas para evadir umbrales de reporte; y cambios repentinos en el comportamiento transaccional sin una explicación comercial plausible.',
        'Nuestro equipo de cumplimiento revisa con prontitud las transacciones marcadas. Cuando una transacción no puede explicarse satisfactoriamente, Convexo puede demorar, suspender o rechazar la transacción pendiente de revisión adicional.',
      ],
    },
    {
      id: 'sar',
      title: '5. Reporte de Operaciones Sospechosas',
      paragraphs: [
        'En caso de que Convexo identifique una transacción o patrón de comportamiento que genere sospecha razonable de lavado de activos, financiación del terrorismo u otro delito financiero, estamos legalmente obligados a presentar un Reporte de Operación Sospechosa (ROS) ante la Unidad de Información y Análisis Financiero (UIAF) de Colombia sin notificar al usuario afectado (prohibición de "alerta al cliente").',
        'Nuestro equipo de cumplimiento está capacitado para identificar y escalar actividades sospechosas. Todos los reportes se manejan con estricta confidencialidad de acuerdo con la ley aplicable.',
      ],
    },
    {
      id: 'sanctions',
      title: '6. Verificación contra Listas de Sanciones',
      paragraphs: [
        'Convexo verifica todos los usuarios y transacciones contra las listas de sanciones aplicables, incluyendo: la lista de Nacionales Especialmente Designados (SDN) de la OFAC; la lista consolidada de sanciones del Consejo de Seguridad de la ONU; la lista consolidada de sanciones de la UE; y la lista de países y regiones sancionadas por la OFAC.',
        'Cualquier usuario o transacción que coincida con una entrada de sanciones será bloqueado de inmediato y remitido a nuestro equipo de cumplimiento para revisión. Convexo no procesará transacciones que violen las leyes de sanciones aplicables bajo ninguna circunstancia.',
      ],
    },
    {
      id: 'records',
      title: '7. Conservación de Registros',
      paragraphs: [
        'Convexo conserva toda la documentación KYC, registros de transacciones, hallazgos de debida diligencia e informes de cumplimiento por un mínimo de cinco (5) años desde la fecha de la última transacción o cierre de cuenta, lo que ocurra después, de conformidad con las regulaciones colombianas de ALA y la Recomendación 11 del GAFI.',
        'Todos los registros se almacenan de forma segura y están disponibles para las autoridades competentes ante requerimiento legal.',
      ],
    },
    {
      id: 'pep',
      title: '8. Personas Expuestas Políticamente (PEP)',
      paragraphs: [
        'Convexo identifica y aplica un escrutinio ampliado a las Personas Expuestas Políticamente (PEP), definidas como individuos que ocupan o han ocupado cargos públicos prominentes, así como sus familiares cercanos y asociados conocidos.',
        'La vinculación de PEPs requiere aprobación de la alta dirección y está sujeta a procedimientos de Debida Diligencia Ampliada. El estado PEP se evalúa al momento del registro y se monitorea de forma continua.',
      ],
    },
    {
      id: 'training',
      title: '9. Capacitación y Controles Internos',
      paragraphs: [
        'Convexo mantiene controles internos AML/CFT que incluyen un Oficial de Cumplimiento designado, responsable de la implementación y supervisión de esta política; capacitación periódica del personal en obligaciones AML/CFT y reconocimiento de señales de alerta; y revisiones periódicas independientes del programa de cumplimiento.',
        'Los empleados y contratistas están obligados a reportar cualquier sospecha AML/CFT al Oficial de Cumplimiento y están protegidos contra represalias por hacer reportes de buena fe.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contacto y Reportes',
      paragraphs: [
        'Para consultas relacionadas con cumplimiento, o para reportar una preocupación sobre un posible asunto AML/CFT, comuníquese con nuestro equipo de cumplimiento en: compliance@convexo.xyz.',
        'Esta política es revisada y actualizada al menos anualmente, o cuando existan cambios materiales en la ley aplicable o en las directrices regulatorias.',
      ],
    },
  ],
}

export const metadata = {
  title: 'AML / CFT Policy — Convexo',
}

export default function AmlPage() {
  return <LegalShell en={en} es={es} />
}
