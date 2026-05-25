export type CenterStructure = { units: string[]; locations: string[] };
export type CompanyStructure = Record<string, CenterStructure>;

export const COMPANY_CENTER_UNIT_LOCATION_MAP: Record<string, CompanyStructure> = {
  "ACBR": {
    "AC01": {
      "units": [
        "NL - NOVVA LOGÍSTICA LTDA"
      ],
      "locations": [
        "GR",
        "TI"
      ]
    },
    "AC02": {
      "units": [
        "NL - NOVVA LOGÍSTICA LTDA"
      ],
      "locations": [
        "GR",
        "TI"
      ]
    }
  },
  "AMTL": {
    "TL01": {
      "units": [
        "SU - SUPRIMENTOS SITREL",
        "TL - SITREL"
      ],
      "locations": [
        "ET",
        "GR",
        "GT",
        "LA",
        "LE",
        "MA",
        "MS",
        "MU",
        "RH",
        "SU",
        "TI",
        "TL"
      ]
    }
  },
  "BF00": {
    "E001": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "EC"
      ]
    },
    "E201": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "CO"
      ]
    },
    "E202": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "GA"
      ]
    },
    "E204": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "CO"
      ]
    },
    "E205": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "BU",
        "CO"
      ]
    },
    "E210": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "FA"
      ]
    },
    "E213": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": []
    },
    "E501": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "RD"
      ]
    },
    "E507": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "RQ"
      ]
    },
    "E601": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "CB"
      ]
    },
    "E602": {
      "units": [
        "BF - BIOFLORESTAS"
      ],
      "locations": [
        "FQ"
      ]
    }
  },
  "BMJF": {
    "4000": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "SU - JUIZ DE FORA - SUPRIMENTOS",
        "UJ - JUIZ DE FORA - SIDERURGIA",
        "UJ - JUIZ DE FORA - TREFILARIA"
      ],
      "locations": [
        "AC",
        "AF",
        "EU",
        "GR",
        "GT",
        "JF",
        "LA",
        "LE",
        "MA",
        "MS",
        "RH",
        "TI",
        "TR"
      ]
    },
    "4100": {
      "units": [
        "BM - BARRA MANSA - SIDERURGIA",
        "BM - BARRA MANSA - TREFILARIA",
        "CD - COMITÊ DIGITAL",
        "SU - BARRA MANSA - ALMOXARIFADO"
      ],
      "locations": [
        "AC",
        "BM",
        "ET",
        "GR",
        "GT",
        "LA",
        "LE",
        "MA",
        "MS",
        "MU",
        "RH",
        "TI",
        "TR"
      ]
    },
    "4200": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "RS - RESENDE - SIDERURGIA",
        "RS - RESENDE - TREFILARIA",
        "SU - RESENDE - ALMOXARIFADO"
      ],
      "locations": [
        "AC",
        "ET",
        "GR",
        "GT",
        "LA",
        "LE",
        "MA",
        "MS",
        "MU",
        "RH",
        "RS",
        "TI",
        "TR"
      ]
    },
    "4300": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "RS - RESENDE - SIDERURGIA",
        "RS - RESENDE - TREFILARIA",
        "SU - RESENDE - ALMOXARIFADO"
      ],
      "locations": [
        "TR"
      ]
    },
    "5000": {
      "units": [
        "ME - METÁLICOS CONTAGEM"
      ],
      "locations": [
        "BH"
      ]
    },
    "6003": {
      "units": [
        "BF - FLORESTAS SF"
      ],
      "locations": [
        "BS"
      ]
    },
    "6004": {
      "units": [
        "BF - FLORESTAS SF"
      ],
      "locations": [
        "RI"
      ]
    },
    "6006": {
      "units": [
        "BF - FLORESTAS SF"
      ],
      "locations": [
        "SC"
      ]
    },
    "6007": {
      "units": [
        "BF - FLORESTAS SF"
      ],
      "locations": [
        "SR"
      ]
    },
    "7115": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "CL"
      ]
    },
    "7500": {
      "units": [
        "BC - VP COMERCIAL",
        "CD - COMITÊ DIGITAL",
        "EC - ESCRITÓRIO CENTRAL - ECA",
        "LP - DIR. LOGÍSTICA E PLAN.",
        "SH - TI - SHARED SERVICE",
        "SU - SUPRIMENTOS CORPORATIVO"
      ],
      "locations": [
        "CO",
        "IA",
        "RD",
        "TI",
        "IF"
      ]
    },
    "7502": {
      "units": [
        "BC - VP COMERCIAL",
        "CD - COMITÊ DIGITAL",
        "LP - DIR. LOGÍSTICA E PLAN.",
        "SH - TI - SHARED SERVICE"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "7510": {
      "units": [
        "BC - VP COMERCIAL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9206": {
      "units": [
        "ME - PÁTIO SUC.IRACEMÁPOLIS",
        "UP - PÁTIO SUC.IRACEMÁPOLIS"
      ],
      "locations": [
        "IR"
      ]
    },
    "9216": {
      "units": [
        "ME - ENTREPOSTO MARACANAÚ"
      ],
      "locations": [
        "MA"
      ]
    },
    "9217": {
      "units": [
        "ME - ENTREPOSTO JABOATÃO"
      ],
      "locations": [
        "JA"
      ]
    },
    "9227": {
      "units": [
        "ME - RCS ALVORADA"
      ],
      "locations": [
        "AV"
      ]
    },
    "9307": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "CL"
      ]
    },
    "9308": {
      "units": [
        "BC - LOJA SALVADOR"
      ],
      "locations": [
        "RD"
      ]
    },
    "9309": {
      "units": [
        "BC - DBA GUARAPUAVA"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9333": {
      "units": [
        "LP - CDB RIO DE JANEIRO",
        "BC - CDB RIO DE JANEIRO"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9335": {
      "units": [
        "BC - DBA BOA VISTA",
        "CD - COMITÊ DIGITAL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9344": {
      "units": [
        "ME - RCS MANAUS"
      ],
      "locations": [
        "MN"
      ]
    },
    "9345": {
      "units": [
        "BC - DBA PATO BRANCO"
      ],
      "locations": [
        "RD",
        "TI",
        "IF"
      ]
    },
    "9351": {
      "units": [
        "ME - ENTREPOSTO PINHAIS"
      ],
      "locations": [
        "CT"
      ]
    },
    "9353": {
      "units": [
        "BC - LOJA BONSUCESSO"
      ],
      "locations": [
        "RD"
      ]
    },
    "9355": {
      "units": [
        "BC - DBA BOA VISTA"
      ],
      "locations": []
    },
    "9360": {
      "units": [
        "BC - CL CONFINS",
        "CD - COMITÊ DIGITAL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9361": {
      "units": [
        "LP - CDB SÃO PAULO",
        "BC - CDB SÃO PAULO"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9366": {
      "units": [
        "BC - CDB SALVADOR"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9367": {
      "units": [
        "BC - HUB SALVADOR",
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "HB",
        "RD",
        "TI"
      ]
    },
    "9368": {
      "units": [
        "BC - CDB FORTALEZA"
      ],
      "locations": []
    },
    "9372": {
      "units": [
        "BC - LOJA ARICANDUVA"
      ],
      "locations": [
        "RD"
      ]
    },
    "9374": {
      "units": [
        "BC - LOJA MOGI DAS CRUZES"
      ],
      "locations": [
        "RD"
      ]
    },
    "9375": {
      "units": [
        "BC - LOJA SJ PINHAIS"
      ],
      "locations": [
        "RD"
      ]
    },
    "9377": {
      "units": [
        "BC - CL EXTREMA",
        "CD - COMITÊ DIGITAL"
      ],
      "locations": [
        "BP",
        "CL",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9378": {
      "units": [
        "BC - LOJA ITAIM PAULISTA"
      ],
      "locations": [
        "RD"
      ]
    },
    "9379": {
      "units": [
        "BC - LOJA OSASCO"
      ],
      "locations": [
        "RD"
      ]
    },
    "9381": {
      "units": [
        "BC - LOJA ITAQUAQUECETUBA"
      ],
      "locations": [
        "RD"
      ]
    },
    "9382": {
      "units": [
        "BC - LOJA BELO HORIZONTE"
      ],
      "locations": [
        "RD"
      ]
    },
    "9397": {
      "units": [
        "BC - LOJA SANTA BÁRBARA"
      ],
      "locations": []
    },
    "9404": {
      "units": [
        "ME - ENTREPOSTO GUARULHOS"
      ],
      "locations": [
        "GU"
      ]
    },
    "9416": {
      "units": [
        "ME - ENTREPOSTO CANDEIAS"
      ],
      "locations": [
        "CA"
      ]
    },
    "9450": {
      "units": [
        "BC - BELGO PRONTO CURITIBA"
      ],
      "locations": [
        "BP"
      ]
    },
    "9460": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "FT - FÁBRICA DE TELAS SP",
        "SU - ALMOXARIFADO FÁBR. TELAS SP"
      ],
      "locations": [
        "EU",
        "GR",
        "GT",
        "LE",
        "MA",
        "MS",
        "RH",
        "SP",
        "TI",
        "TT"
      ]
    },
    "9515": {
      "units": [
        "ME - ENTREPOSTO FIAT GOIANIA"
      ],
      "locations": [
        "GO"
      ]
    },
    "9600": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "CL"
      ]
    },
    "9607": {
      "units": [
        "LP - CDB BELO HORIZONTE",
        "BC - CDB BELO HORIZONTE",
        "CD - COMITÊ DIGITAL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9618": {
      "units": [
        "LP - CDB CURITIBA",
        "BC - CDB CURITIBA"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9633": {
      "units": [
        "BC - CDB MARABÁ"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9650": {
      "units": [
        "ME - ENTREPOSTO BAURU"
      ],
      "locations": [
        "BU"
      ]
    },
    "9651": {
      "units": [
        "BC - DBA CASCAVEL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9655": {
      "units": [
        "BC - DBA JUIZ DE FORA"
      ],
      "locations": []
    },
    "9660": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "CL"
      ]
    },
    "9661": {
      "units": [
        "BC - DBA RIO DAS PEDRAS",
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "CS",
        "TI"
      ]
    },
    "9670": {
      "units": [
        "BC - DBA JUIZ DE FORA",
        "CD - COMITÊ DIGITAL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9682": {
      "units": [
        "BC - HUB RIO DAS PEDRAS",
        "CD - COMITÊ DIGITAL",
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "HB",
        "RD",
        "TI"
      ]
    },
    "9683": {
      "units": [
        "BC - LOJA RECIFE"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9684": {
      "units": [
        "BC - CDB BELÉM"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9689": {
      "units": [
        "LP - CDB RECIFE",
        "BC - CDB RECIFE"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9696": {
      "units": [
        "BC - LOJA GUARULHOS"
      ],
      "locations": [
        "RD"
      ]
    },
    "9703": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "CL"
      ]
    },
    "9718": {
      "units": [
        "LP - CDB SÃO PAULO II",
        "BC - CDB SÃO PAULO II"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9719": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN.",
        "BC - VP COMERCIAL"
      ],
      "locations": [
        "BP"
      ]
    },
    "9728": {
      "units": [
        "BC - BELGO PRONTO RIO DAS PEDRAS"
      ],
      "locations": [
        "RD",
        "TI"
      ]
    },
    "9729": {
      "units": [
        "BC - BELGO PRONTO RIO DAS PEDRAS",
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "BP"
      ]
    },
    "9733": {
      "units": [
        "BC - CDB RIO DAS PEDRAS"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "9840": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "GA - GUILMAN AMORIM",
        "SU - SUPRIMENTOS - MONLEVADE",
        "UM - MONLEVADE"
      ],
      "locations": [
        "AC",
        "AF",
        "EU",
        "GA",
        "GR",
        "GT",
        "JM",
        "LA",
        "LE",
        "MA",
        "MS",
        "RE",
        "RH",
        "SI",
        "TI"
      ]
    },
    "9860": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "SU - ALMOXARIFADO PIRACICABA",
        "UP - PIRACICABA"
      ],
      "locations": [
        "AC",
        "EU",
        "GR",
        "IR",
        "LA",
        "LE",
        "MA",
        "MS",
        "PI",
        "RH",
        "TI"
      ]
    },
    "9870": {
      "units": [
        "CD - COMITÊ DIGITAL",
        "SU - ALMOXARIFADO SABARÁ",
        "US - SABARÁ"
      ],
      "locations": [
        "BA",
        "EU",
        "GR",
        "LE",
        "MA",
        "MS",
        "RH",
        "SA",
        "TI"
      ]
    },
    "9880": {
      "units": [
        "BC - BELGO PRONTO MARACANAÚ",
        "CD - COMITÊ DIGITAL",
        "LP - DIR. LOGÍSTICA E PLAN."
      ],
      "locations": [
        "BP",
        "RD",
        "TI",
        "IF"
      ]
    },
    "9881": {
      "units": [
        "LP - DIR. LOGÍSTICA E PLAN.",
        "RP - TREFILARIA RIO DAS PEDRAS",
        "SU - ALMOXARIFADO RIO DAS PEDRAS"
      ],
      "locations": [
        "CS",
        "GR",
        "RP"
      ]
    },
    "9910": {
      "units": [
        "LP - CDB FORTALEZA",
        "BC - CDB FORTALEZA",
        "CD - COMITÊ DIGITAL"
      ],
      "locations": [
        "BP",
        "RD",
        "TI"
      ]
    },
    "EN01": {
      "units": [
        "CE - COMERCIALIZADORA DE ENERGIA"
      ],
      "locations": []
    },
    "MA10": {
      "units": [
        "MA - MINA DO ANDRADE"
      ],
      "locations": [
        "BR",
        "FR",
        "GR",
        "MA",
        "MI",
        "MS",
        "OV",
        "SF",
        "TI",
        "US"
      ]
    },
    "SA20": {
      "units": [
        "MS - MINA SERRA AZUL"
      ],
      "locations": [
        "BR",
        "FR",
        "GR",
        "MA",
        "MI",
        "MS",
        "OV",
        "SF",
        "TI",
        "US"
      ]
    }
  },
  "AGS": {
    "AG01": {
      "units": [
        "AG - AGS"
      ],
      "locations": [
        "GR",
        "TI"
      ]
    },
    "AG02": {
      "units": [
        "AG - AGS"
      ],
      "locations": [
        "GR",
        "TI"
      ]
    }
  },
  "CF00": {
    "CF00": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "GR",
        "LT",
        "SC",
        "TI"
      ]
    }
  },
  "CF18": {
    "CF18": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "CF",
        "CX",
        "GR",
        "IN",
        "LT",
        "MF",
        "SC",
        "TI",
        "TK",
        "TS"
      ]
    }
  },
  "CF19": {
    "CF19": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "CF",
        "CX",
        "GR",
        "IN",
        "LT",
        "MF",
        "SC",
        "TI",
        "TK",
        "TS"
      ]
    }
  },
  "CF20": {
    "CF20": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "CF",
        "CX",
        "GR",
        "IN",
        "LT",
        "MF",
        "SC",
        "TI",
        "TK",
        "TS"
      ]
    }
  },
  "CF21": {
    "CF21": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "CF",
        "CX",
        "GR",
        "IN",
        "LT",
        "MF",
        "SC",
        "TI",
        "TK",
        "TS"
      ]
    }
  },
  "CF22": {
    "CF22": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "CF",
        "CX",
        "GR",
        "IN",
        "LT",
        "MF",
        "SC",
        "TI",
        "TK",
        "TS"
      ]
    }
  },
  "CF23": {
    "CF23": {
      "units": [
        "CF - CENTRAL FOTO VOLTAICA"
      ],
      "locations": [
        "BC",
        "CF",
        "CX",
        "GR",
        "IN",
        "LT",
        "MF",
        "SC",
        "TI",
        "TK",
        "TS"
      ]
    }
  }
};
