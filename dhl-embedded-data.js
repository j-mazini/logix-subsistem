/**
 * Dados importados dos ficheiros Excel (DISCO, OPMS, Time Window).
 * Gerado por scripts/import_excel_to_data.py
 * - DISCO_RouteData: rotas AM/PM
 * - BA Daily Figures 3: OPMS (counts, byRoute)
 * - TW 300126: Time Window (% TW Adh DL) por rota
 */
(function () {
  'use strict';
  window.DISCO_DATA = {
  "am": [
    "MD7A",
    "MD7B",
    "MD7C",
    "MD7D",
    "MD7E",
    "MD7X"
  ],
  "pm": [],
  "byRoute": {
    "MD7A": {
      "sortWave": "AM",
      "loop": "D",
      "depot": null,
      "subpostcodes": []
    },
    "MD7B": {
      "sortWave": "AM",
      "loop": "D",
      "depot": null,
      "subpostcodes": []
    },
    "MD7C": {
      "sortWave": "AM",
      "loop": "D",
      "depot": null,
      "subpostcodes": []
    },
    "MD7D": {
      "sortWave": "AM",
      "loop": "D",
      "depot": null,
      "subpostcodes": []
    },
    "MD7E": {
      "sortWave": "AM",
      "loop": "D",
      "depot": null,
      "subpostcodes": []
    },
    "MD7X": {
      "sortWave": "AM",
      "loop": "D",
      "depot": null,
      "subpostcodes": []
    }
  }
};

  window.OPMS_EMBEDDED_DATA = {
  "2026-01-30": {
    "counts": {
      "HN": 42,
      "OK": 1746,
      "PU": 291,
      "CA": 16,
      "FP": 72,
      "BA": 11,
      "RD": 6,
      "CM": 1,
      "NR": 1
    },
    "byRoute": {
      "LCY|DY1A": {
        "depot": "LCY",
        "route": "DY1A",
        "counts": {
          "HN": 1,
          "OK": 59,
          "PU": 6
        }
      },
      "LCY|DY1B": {
        "depot": "LCY",
        "route": "DY1B",
        "counts": {
          "CA": 1,
          "FP": 5,
          "HN": 1,
          "OK": 49,
          "PU": 13
        }
      },
      "LCY|DY1C": {
        "depot": "LCY",
        "route": "DY1C",
        "counts": {
          "BA": 1,
          "FP": 3,
          "HN": 2,
          "OK": 61,
          "PU": 7
        }
      },
      "LCY|DY1X": {
        "depot": "LCY",
        "route": "DY1X",
        "counts": {
          "OK": 66,
          "PU": 16
        }
      },
      "LCY|DY2A": {
        "depot": "LCY",
        "route": "DY2A",
        "counts": {
          "FP": 1,
          "OK": 64,
          "PU": 9
        }
      },
      "LCY|DY2B": {
        "depot": "LCY",
        "route": "DY2B",
        "counts": {
          "FP": 2,
          "HN": 2,
          "OK": 86,
          "PU": 7
        }
      },
      "LCY|DY2C": {
        "depot": "LCY",
        "route": "DY2C",
        "counts": {
          "CA": 1,
          "FP": 2,
          "HN": 1,
          "OK": 67,
          "PU": 6
        }
      },
      "LCY|DY2D": {
        "depot": "LCY",
        "route": "DY2D",
        "counts": {
          "CA": 1,
          "FP": 3,
          "HN": 2,
          "OK": 69,
          "PU": 12
        }
      },
      "LCY|DY2P": {
        "depot": "LCY",
        "route": "DY2P",
        "counts": {
          "CA": 1,
          "FP": 2,
          "OK": 44,
          "PU": 8,
          "RD": 1
        }
      },
      "LCY|DY2X": {
        "depot": "LCY",
        "route": "DY2X",
        "counts": {
          "BA": 1,
          "CA": 1,
          "FP": 3,
          "HN": 2,
          "OK": 53,
          "PU": 5
        }
      },
      "LON|LL3A": {
        "depot": "LON",
        "route": "LL3A",
        "counts": {
          "FP": 9,
          "HN": 2,
          "OK": 61,
          "PU": 13
        }
      },
      "LON|LL3B": {
        "depot": "LON",
        "route": "LL3B",
        "counts": {
          "BA": 1,
          "CA": 2,
          "FP": 4,
          "HN": 4,
          "OK": 27,
          "PU": 7
        }
      },
      "LON|LL3C": {
        "depot": "LON",
        "route": "LL3C",
        "counts": {
          "BA": 1,
          "FP": 3,
          "HN": 4,
          "OK": 38,
          "PU": 19,
          "RD": 1
        }
      },
      "LON|LL3D": {
        "depot": "LON",
        "route": "LL3D",
        "counts": {
          "BA": 2,
          "FP": 5,
          "HN": 4,
          "OK": 53,
          "PU": 12
        }
      },
      "LON|LL3X": {
        "depot": "LON",
        "route": "LL3X",
        "counts": {
          "HN": 3,
          "OK": 57,
          "RD": 1
        }
      },
      "LON|LL4A": {
        "depot": "LON",
        "route": "LL4A",
        "counts": {
          "CA": 2,
          "FP": 2,
          "OK": 62,
          "PU": 10,
          "RD": 1
        }
      },
      "LON|LL4B": {
        "depot": "LON",
        "route": "LL4B",
        "counts": {
          "FP": 2,
          "HN": 2,
          "OK": 51,
          "PU": 8,
          "RD": 1
        }
      },
      "LON|LL4X": {
        "depot": "LON",
        "route": "LL4X",
        "counts": {
          "BA": 1,
          "FP": 2,
          "HN": 2,
          "OK": 63,
          "PU": 7
        }
      },
      "LON|LM9A": {
        "depot": "LON",
        "route": "LM9A",
        "counts": {
          "OK": 50
        }
      },
      "LON|LM9X": {
        "depot": "LON",
        "route": "LM9X",
        "counts": {
          "BA": 2,
          "CA": 1,
          "CM": 1,
          "OK": 78
        }
      },
      "MSE|MD7A": {
        "depot": "MSE",
        "route": "MD7A",
        "counts": {
          "CA": 1,
          "FP": 5,
          "OK": 55,
          "PU": 7
        }
      },
      "MSE|MD7B": {
        "depot": "MSE",
        "route": "MD7B",
        "counts": {
          "FP": 1,
          "HN": 1,
          "OK": 44,
          "PU": 8
        }
      },
      "MSE|MD7C": {
        "depot": "MSE",
        "route": "MD7C",
        "counts": {
          "FP": 2,
          "HN": 3,
          "OK": 43,
          "PU": 19
        }
      },
      "MSE|MD7D": {
        "depot": "MSE",
        "route": "MD7D",
        "counts": {
          "BA": 1,
          "HN": 1,
          "OK": 39,
          "PU": 10
        }
      },
      "MSE|MD7E": {
        "depot": "MSE",
        "route": "MD7E",
        "counts": {
          "CA": 1,
          "FP": 6,
          "OK": 30,
          "PU": 10
        }
      },
      "MSE|MD7X": {
        "depot": "MSE",
        "route": "MD7X",
        "counts": {
          "FP": 4,
          "OK": 48,
          "PU": 17
        }
      },
      "MSE|MD9A": {
        "depot": "MSE",
        "route": "MD9A",
        "counts": {
          "BA": 1,
          "CA": 1,
          "FP": 3,
          "HN": 1,
          "NR": 1,
          "OK": 69,
          "PU": 16,
          "RD": 1
        }
      },
      "MSE|MD9B": {
        "depot": "MSE",
        "route": "MD9B",
        "counts": {
          "FP": 1,
          "OK": 54,
          "PU": 7
        }
      },
      "MSE|MD9C": {
        "depot": "MSE",
        "route": "MD9C",
        "counts": {
          "HN": 1,
          "OK": 55,
          "PU": 17
        }
      },
      "MSE|MD9D": {
        "depot": "MSE",
        "route": "MD9D",
        "counts": {
          "OK": 37,
          "PU": 6
        }
      },
      "MSE|MD9X": {
        "depot": "MSE",
        "route": "MD9X",
        "counts": {
          "CA": 3,
          "FP": 2,
          "HN": 1,
          "OK": 41,
          "PU": 9
        }
      },
      "MSE|MD9P": {
        "depot": "MSE",
        "route": "MD9P",
        "counts": {
          "OK": 40
        }
      },
      "LCY|DY2R": {
        "depot": "LCY",
        "route": "DY2R",
        "counts": {
          "HN": 2,
          "OK": 33
        }
      }
    },
    "twByRoute": {
      "LL1A": 1.0,
      "LL1B": 0.94,
      "LL1C": 0.975,
      "LL1X": 1.0,
      "LL2A": 0.989247311827957,
      "LL2B": 0.9509803921568627,
      "LL2X": 1.0,
      "LL3A": 1.0,
      "LL3B": 1.0,
      "LL3C": 0.7708333333333334,
      "LL3D": 0.9534883720930233,
      "LL3X": 0.9818181818181818,
      "LL4A": 0.9836065573770492,
      "LL4B": 0.9142857142857143,
      "LL4X": 0.8928571428571429,
      "LM1A": 1.0,
      "LM1B": 0.32954545454545453,
      "LM1C": 1.0,
      "LM1D": 0.8888888888888888,
      "LM1X": 0.8833333333333333,
      "LM2A": 0.9791666666666666,
      "LM2B": 1.0,
      "LM2C": 0.9836065573770492,
      "LM2X": 0.9,
      "LM3A": 1.0,
      "LM3B": 0.9753086419753086,
      "LM3C": 1.0,
      "LM3X": 0.975,
      "LM4A": 0.9883720930232558,
      "LM4B": 0.7761194029850746,
      "LM4C": 1.0,
      "LM4X": 1.0
    },
    "incomeByRouteFromExcel": {}
  }
};
})();
