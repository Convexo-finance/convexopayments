import { LegalShell, type LegalContent } from '../_components/LegalShell'

const en: LegalContent = {
  title: 'Privacy Policy',
  subtitle: 'Legal',
  sections: [
    {
      id: 'intro',
      title: '1. Introduction',
      paragraphs: [
        'Convexo SAS ("Convexo", "we", "us", or "our") is committed to protecting the personal information of its users. This Privacy Policy describes how we collect, use, share, and safeguard the information you provide when accessing or using the Convexo platform at pay.convexo.xyz (the "Platform").',
        'By creating an account or using our services, you acknowledge that you have read and understood this Privacy Policy and agree to the processing of your personal data as described herein. If you do not agree, you must discontinue use of the Platform immediately.',
        'This policy is subject to applicable Colombian data protection law (Law 1581 of 2012 and Decree 1377 of 2013), as well as any other applicable international regulations.',
      ],
    },
    {
      id: 'collection',
      title: '2. Information We Collect',
      paragraphs: [
        'We collect information you provide directly, including: full name, national identification number (NIN/CC/CE/Passport), email address, phone number, company name, tax identification number (RUT/NIT), residential and business address, and bank account details required for payment processing.',
        'We also collect identity verification documents, including government-issued photo ID and RUT certificates issued by the DIAN. These are necessary to comply with our Anti-Money Laundering (AML) and Know Your Customer (KYC) obligations.',
        'We automatically collect technical information such as IP address, browser type, operating system, device identifiers, and usage logs when you interact with the Platform. This data is used to maintain security and improve service quality.',
        'Blockchain transaction data — including wallet addresses and on-chain activity — may be collected when you use USDC wallet or OTC services. This data is inherently public on the blockchain and is treated in accordance with its public nature.',
      ],
    },
    {
      id: 'use',
      title: '3. How We Use Your Information',
      paragraphs: [
        'We use your personal data to: create and maintain your account; process payment and collection orders on your behalf; comply with legal and regulatory obligations including AML/CFT requirements; verify your identity before granting full access to the Platform; communicate important service updates, transaction confirmations, and alerts.',
        'We may also use aggregated, anonymized data for product development, business intelligence, and improving the Platform\'s features. This data does not identify any individual user.',
        'We do not use your personal data for automated decision-making or profiling that produces legal effects without human oversight.',
      ],
    },
    {
      id: 'sharing',
      title: '4. Data Sharing and Disclosure',
      paragraphs: [
        'We do not sell, rent, or trade your personal information to third parties. We share your data only in the following limited circumstances:',
        'Service Providers: We engage trusted third-party providers (including authentication services, cloud infrastructure, and email services) who process data on our behalf under strict confidentiality agreements.',
        'Legal Obligations: We may disclose information to regulatory authorities, law enforcement, or government bodies when required by applicable law, court order, or to protect the rights, property, or safety of Convexo, our users, or the public.',
        'Corporate Transactions: In the event of a merger, acquisition, or asset sale, your data may be transferred as part of that transaction. We will notify you prior to any such transfer.',
      ],
    },
    {
      id: 'security',
      title: '5. Data Security',
      paragraphs: [
        'We implement industry-standard technical and organizational security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These include end-to-end encryption for sensitive transmissions, role-based access controls, regular security audits, and secure infrastructure hosted by certified cloud providers.',
        'Despite our best efforts, no system is completely secure. We cannot guarantee absolute security of your data. In the event of a data breach that affects your rights and freedoms, we will notify you promptly in accordance with applicable law.',
      ],
    },
    {
      id: 'rights',
      title: '6. Your Rights',
      paragraphs: [
        'Under Colombian data protection law and applicable regulations, you have the right to: access a copy of the personal data we hold about you; request correction of inaccurate or incomplete data; request deletion of your data, subject to legal retention requirements; object to processing for marketing purposes; withdraw consent at any time, without affecting the lawfulness of prior processing.',
        'To exercise any of these rights, please contact us at the address provided in Section 9. We will respond to your request within the timeframe established by applicable law.',
      ],
    },
    {
      id: 'retention',
      title: '7. Data Retention',
      paragraphs: [
        'We retain your personal data for as long as your account is active or as needed to provide services. Following account closure, we retain certain data for a minimum of five (5) years to comply with AML/CFT regulatory requirements and applicable accounting obligations.',
        'Identity verification documents and transaction records are retained for the period required by Colombian financial regulations and the applicable FATF recommendations.',
      ],
    },
    {
      id: 'cookies',
      title: '8. Cookies',
      paragraphs: [
        'The Platform uses strictly necessary cookies to maintain your authentication session and language preference (NEXT_LOCALE). We do not use tracking, advertising, or analytics cookies. No third-party cookies are placed on your device through our Platform.',
      ],
    },
    {
      id: 'changes',
      title: '9. Changes to This Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. If changes are material, we will notify you via email or a prominent notice on the Platform. Continued use of the Platform after changes constitutes acceptance of the updated policy.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contact',
      paragraphs: [
        'For questions, requests, or complaints regarding your personal data, please contact our Data Protection Officer at: legal@convexo.xyz. You may also submit a written request to: Convexo SAS, [Address to be completed], Colombia.',
        'If you believe your data protection rights have been violated, you have the right to lodge a complaint with the Superintendencia de Industria y Comercio (SIC), the Colombian data protection authority.',
      ],
    },
  ],
}

const es: LegalContent = {
  title: 'Política de Privacidad',
  subtitle: 'Legal',
  sections: [
    {
      id: 'intro',
      title: '1. Introducción',
      paragraphs: [
        'Convexo SAS ("Convexo", "nosotros", "nos" o "nuestro") está comprometida con la protección de la información personal de sus usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, compartimos y protegemos la información que usted proporciona al acceder o utilizar la plataforma Convexo en pay.convexo.xyz (la "Plataforma").',
        'Al crear una cuenta o utilizar nuestros servicios, usted reconoce que ha leído y comprendido esta Política de Privacidad y acepta el tratamiento de sus datos personales tal como se describe en este documento. Si no está de acuerdo, debe dejar de usar la Plataforma de inmediato.',
        'Esta política está sujeta a la legislación colombiana de protección de datos vigente (Ley 1581 de 2012 y Decreto 1377 de 2013), así como a cualquier otra regulación internacional aplicable.',
      ],
    },
    {
      id: 'collection',
      title: '2. Información que Recopilamos',
      paragraphs: [
        'Recopilamos información que usted proporciona directamente, incluyendo: nombre completo, número de identificación nacional (CC/CE/Pasaporte), correo electrónico, teléfono, nombre de la empresa, número de identificación tributaria (RUT/NIT), dirección residencial y comercial, y datos bancarios necesarios para el procesamiento de pagos.',
        'También recopilamos documentos de verificación de identidad, incluyendo documento de identificación con foto y certificados de RUT emitidos por la DIAN. Estos son necesarios para cumplir con nuestras obligaciones de Prevención de Lavado de Activos (AML) y Conocimiento del Cliente (KYC).',
        'Recopilamos automáticamente información técnica como dirección IP, tipo de navegador, sistema operativo, identificadores de dispositivo y registros de uso cuando interactúa con la Plataforma. Estos datos se utilizan para mantener la seguridad y mejorar la calidad del servicio.',
        'Los datos de transacciones blockchain — incluyendo direcciones de billetera y actividad en cadena — pueden recopilarse cuando utiliza los servicios de billetera USDC u OTC. Estos datos son inherentemente públicos en la blockchain y se tratan de acuerdo con su naturaleza pública.',
      ],
    },
    {
      id: 'use',
      title: '3. Cómo Usamos su Información',
      paragraphs: [
        'Utilizamos sus datos personales para: crear y mantener su cuenta; procesar órdenes de pago y cobro en su nombre; cumplir con obligaciones legales y regulatorias, incluyendo requisitos AML/CFT; verificar su identidad antes de otorgar acceso completo a la Plataforma; comunicar actualizaciones importantes del servicio, confirmaciones de transacciones y alertas.',
        'También podemos usar datos agregados y anonimizados para el desarrollo de productos, inteligencia empresarial y la mejora de las funciones de la Plataforma. Estos datos no identifican a ningún usuario individual.',
        'No utilizamos sus datos personales para la toma de decisiones automatizada ni para perfiles que produzcan efectos legales sin supervisión humana.',
      ],
    },
    {
      id: 'sharing',
      title: '4. Compartición y Divulgación de Datos',
      paragraphs: [
        'No vendemos, alquilamos ni intercambiamos su información personal con terceros. Compartimos sus datos solo en las siguientes circunstancias limitadas:',
        'Proveedores de Servicios: Contratamos proveedores terceros de confianza (incluidos servicios de autenticación, infraestructura en la nube y servicios de correo electrónico) que procesan datos en nuestro nombre bajo estrictos acuerdos de confidencialidad.',
        'Obligaciones Legales: Podemos divulgar información a autoridades regulatorias, fuerzas del orden o entidades gubernamentales cuando lo exija la ley aplicable, una orden judicial, o para proteger los derechos, la propiedad o la seguridad de Convexo, nuestros usuarios o el público.',
        'Transacciones Corporativas: En caso de fusión, adquisición o venta de activos, sus datos pueden transferirse como parte de esa transacción. Le notificaremos antes de dicha transferencia.',
      ],
    },
    {
      id: 'security',
      title: '5. Seguridad de los Datos',
      paragraphs: [
        'Implementamos medidas de seguridad técnicas y organizativas estándar de la industria para proteger sus datos personales contra el acceso, alteración, divulgación o destrucción no autorizados. Estas incluyen cifrado de extremo a extremo para transmisiones sensibles, controles de acceso basados en roles, auditorías de seguridad regulares e infraestructura segura alojada por proveedores de nube certificados.',
        'A pesar de nuestros mejores esfuerzos, ningún sistema es completamente seguro. No podemos garantizar la seguridad absoluta de sus datos. En caso de una violación de datos que afecte sus derechos y libertades, le notificaremos de inmediato de acuerdo con la ley aplicable.',
      ],
    },
    {
      id: 'rights',
      title: '6. Sus Derechos',
      paragraphs: [
        'Bajo la legislación colombiana de protección de datos y las regulaciones aplicables, usted tiene el derecho a: acceder a una copia de los datos personales que conservamos sobre usted; solicitar la corrección de datos inexactos o incompletos; solicitar la eliminación de sus datos, sujeto a los requisitos legales de retención; oponerse al procesamiento con fines de marketing; retirar el consentimiento en cualquier momento, sin afectar la legalidad del procesamiento previo.',
        'Para ejercer cualquiera de estos derechos, contáctenos en la dirección proporcionada en la Sección 10. Responderemos a su solicitud dentro del plazo establecido por la ley aplicable.',
      ],
    },
    {
      id: 'retention',
      title: '7. Retención de Datos',
      paragraphs: [
        'Conservamos sus datos personales mientras su cuenta esté activa o según sea necesario para prestar los servicios. Tras el cierre de la cuenta, conservamos ciertos datos durante un mínimo de cinco (5) años para cumplir con los requisitos regulatorios AML/CFT y las obligaciones contables aplicables.',
        'Los documentos de verificación de identidad y los registros de transacciones se conservan durante el período exigido por las regulaciones financieras colombianas y las recomendaciones del GAFI aplicables.',
      ],
    },
    {
      id: 'cookies',
      title: '8. Cookies',
      paragraphs: [
        'La Plataforma utiliza cookies estrictamente necesarias para mantener su sesión de autenticación y la preferencia de idioma (NEXT_LOCALE). No utilizamos cookies de seguimiento, publicidad ni análisis. No se colocan cookies de terceros en su dispositivo a través de nuestra Plataforma.',
      ],
    },
    {
      id: 'changes',
      title: '9. Cambios en Esta Política',
      paragraphs: [
        'Podemos actualizar esta Política de Privacidad periódicamente. Cuando lo hagamos, revisaremos la fecha de "Última actualización" en la parte superior de esta página. Si los cambios son materiales, le notificaremos por correo electrónico o mediante un aviso destacado en la Plataforma. El uso continuado de la Plataforma tras los cambios constituye la aceptación de la política actualizada.',
      ],
    },
    {
      id: 'contact',
      title: '10. Contacto',
      paragraphs: [
        'Para preguntas, solicitudes o quejas sobre sus datos personales, contáctenos con nuestro Oficial de Protección de Datos en: legal@convexo.xyz. También puede enviar una solicitud escrita a: Convexo SAS, [Dirección a completar], Colombia.',
        'Si considera que sus derechos de protección de datos han sido vulnerados, tiene el derecho a presentar una queja ante la Superintendencia de Industria y Comercio (SIC), la autoridad colombiana de protección de datos.',
      ],
    },
  ],
}

export const metadata = {
  title: 'Privacy Policy — Convexo',
}

export default function PrivacyPage() {
  return <LegalShell en={en} es={es} />
}
