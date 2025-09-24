// src/components/shortcutPill.ts
function detectOS() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) {
    return "mac";
  } else if (userAgent.includes("win")) {
    return "windows";
  } else if (userAgent.includes("linux")) {
    return "linux";
  }
  return "other";
}
function getShortcutDisplay(os) {
  switch (os) {
    case "mac":
      return "\u2318K";
    case "windows":
    case "linux":
      return "Ctrl+K";
    case "other":
      return "\u2318K";
    default:
      return "\u2318K";
  }
}
function getTooltipText(os) {
  switch (os) {
    case "mac":
      return "Press / or \u2318K to focus search";
    case "windows":
    case "linux":
      return "Press / or Ctrl+K to focus search";
    case "other":
      return "Press / or \u2318K to focus search";
    default:
      return "Press / or \u2318K to focus search";
  }
}
function createShortcutPill(options = {}) {
  const os = detectOS();
  const shortcutDisplay = getShortcutDisplay(os);
  const tooltipText = getTooltipText(os);
  const pill = document.createElement("div");
  pill.className = "shortcut-pill";
  pill.setAttribute("title", tooltipText);
  pill.setAttribute("aria-label", tooltipText);
  pill.setAttribute("role", "img");
  const keys = shortcutDisplay.split("+");
  keys.forEach((key, index) => {
    if (index > 0) {
      const plus = document.createElement("span");
      plus.className = "shortcut-pill__plus";
      plus.textContent = "+";
      pill.appendChild(plus);
    }
    const keyElement = document.createElement("kbd");
    keyElement.className = "shortcut-pill__key";
    keyElement.textContent = key;
    pill.appendChild(keyElement);
  });
  return {
    element: pill
  };
}

// src/components/header.ts
function createHeader(options) {
  const header2 = document.createElement("header");
  header2.className = "app-header";
  const nav = document.createElement("nav");
  nav.className = "app-nav";
  const brand = document.createElement("div");
  brand.className = "brand";
  const logoLink = document.createElement("button");
  logoLink.type = "button";
  logoLink.className = "logo-link";
  logoLink.setAttribute("aria-label", "Go to Home");
  const logoSvg = document.createElement("div");
  logoSvg.className = "logo-svg";
  logoSvg.innerHTML = `<svg id="btLogoIcon" aria-label="Logo SVG" fill="none" viewBox="0 0 78 97" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M32.058 18.013H15.706V.026H0V49.726c0 17.513 14.198 31.71 31.711 31.71 17.514 0 31.711-14.198 31.711-31.711 0-17.398-14.01-31.525-31.364-31.712Zm-.347 47.67c-8.813 0-15.958-7.145-15.958-15.958 0-8.814 7.145-15.958 15.958-15.958 8.814 0 15.958 7.144 15.958 15.958 0 8.813-7.144 15.958-15.958 15.958Z" fill="#001A43"></path><path d="m54.336 9.411-3.19 5.524c12.206 6.823 20.46 19.87 20.46 34.846 0 22.033-17.861 39.895-39.895 39.895-7.48 0-14.477-2.06-20.46-5.641l-3.188 5.523A46.004 46.004 0 0 0 31.71 96.07C57.235 96.07 78 75.305 78 49.781c0-17.311-9.554-32.43-23.664-40.37Z" fill="#00D8D8"></path></svg>`;
  logoLink.appendChild(logoSvg);
  brand.appendChild(logoLink);
  const searchArea = document.createElement("div");
  searchArea.className = "search-area";
  const searchForm = document.createElement("form");
  searchForm.className = "search-form";
  searchForm.setAttribute("role", "search");
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.name = "global-search";
  searchInput.id = "global-search";
  searchInput.placeholder = "Search projects, invoices, documents\u2026";
  searchInput.autocomplete = "off";
  const searchIcon = document.createElement("i");
  searchIcon.className = "search-icon";
  searchIcon.setAttribute("data-lucide", "search");
  const shortcutPill = createShortcutPill();
  shortcutPill.element.className += " search-shortcut-pill";
  const dialogHost = document.createElement("div");
  dialogHost.className = "search-dialog-host";
  searchForm.append(searchIcon, searchInput, shortcutPill.element);
  searchArea.append(searchForm, dialogHost);
  const navActions = document.createElement("div");
  navActions.className = "nav-actions";
  const homeButton = document.createElement("button");
  homeButton.type = "button";
  homeButton.className = "home-button";
  homeButton.textContent = "Home";
  const resultsButton = document.createElement("button");
  resultsButton.type = "button";
  resultsButton.dataset.route = "results";
  resultsButton.textContent = "Results";
  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.dataset.route = "settings";
  settingsButton.textContent = "Settings";
  navActions.append(homeButton, resultsButton, settingsButton);
  nav.append(brand, searchArea, navActions);
  header2.append(nav);
  searchInput.addEventListener("input", () => {
    options.onSearchChange(searchInput.value);
  });
  searchInput.addEventListener("focus", () => {
    shortcutPill.element.style.display = "none";
    options.onSearchFocus?.();
  });
  searchInput.addEventListener("blur", () => {
    shortcutPill.element.style.display = "inline-flex";
    options.onSearchBlur?.();
  });
  searchInput.addEventListener("keydown", (event) => {
    options.onSearchKeyDown?.(event);
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    options.onSearchSubmit();
  });
  homeButton.addEventListener("click", () => {
    options.onHome();
  });
  logoLink.addEventListener("click", () => {
    options.onHome();
  });
  navActions.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const route = target.dataset.route;
    if (!route) {
      return;
    }
    options.onNavigate(route);
  });
  const setActiveRoute = (route) => {
    const isHomeActive = route === "home";
    homeButton.classList.toggle("is-active", isHomeActive);
    homeButton.setAttribute("aria-pressed", String(isHomeActive));
    for (const button of navActions.querySelectorAll("button[data-route]")) {
      const isActive = button.dataset.route === route;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  };
  const setMonetarySearchMode = (isMonetary) => {
    searchForm.classList.toggle("monetary-search", isMonetary);
    searchInput.classList.toggle("monetary-search", isMonetary);
  };
  return {
    element: header2,
    searchInput,
    dialogHost,
    setActiveRoute,
    setMonetarySearchMode
  };
}

// src/types.ts
function isFinancialRecord(record) {
  return record.entityType === "ClientInvoice" || record.entityType === "PurchaseOrder" || record.entityType === "Bill" || record.entityType === "Receipt" || record.entityType === "Payment";
}
function isPersonRecord(record) {
  return record.entityType === "Person";
}
function isOrganizationRecord(record) {
  return record.entityType === "Organization";
}
function isBuildertrendRecord(record) {
  return record.entityType === "Buildertrend";
}
function isDailyLogRecord(record) {
  return record.entityType === "DailyLog";
}

// src/utils/format.ts
var ENTITY_LABELS = {
  Document: { singular: "Document", plural: "Documents" },
  DailyLog: { singular: "Daily Log", plural: "Daily Logs" },
  ClientInvoice: { singular: "Client Invoice", plural: "Client Invoices" },
  PurchaseOrder: { singular: "Purchase Order", plural: "Purchase Orders" },
  Bill: { singular: "Bill", plural: "Bills" },
  Receipt: { singular: "Receipt", plural: "Receipts" },
  Payment: { singular: "Payment", plural: "Payments" },
  Person: { singular: "Person", plural: "People" },
  Organization: { singular: "Organization", plural: "Organizations" },
  Buildertrend: { singular: "Buildertrend", plural: "Buildertrend" }
};
function formatEntityType(type, options) {
  const label = ENTITY_LABELS[type];
  if (!label) {
    return type;
  }
  return options?.plural ? label.plural : label.singular;
}
function formatCurrency(amount, currency = "USD") {
  if (amount == null || isNaN(amount)) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

// node_modules/dinero.js/build/esm/dinero.js
var Defaults = {
  defaultAmount: 0,
  defaultCurrency: "USD",
  defaultPrecision: 2
};
var Globals = {
  globalLocale: "en-US",
  globalFormat: "$0,0.00",
  globalRoundingMode: "HALF_EVEN",
  globalFormatRoundingMode: "HALF_AWAY_FROM_ZERO",
  globalExchangeRatesApi: {
    endpoint: void 0,
    headers: void 0,
    propertyPath: void 0
  }
};
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
function _toArray(arr) {
  return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest();
}
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
var Static = {
  /**
   * Returns an array of Dinero objects, normalized to the same precision (the highest).
   *
   * @memberof module:Dinero
   * @method
   *
   * @param {Dinero[]} objects - An array of Dinero objects
   *
   * @example
   * // returns an array of Dinero objects
   * // both with a precision of 3
   * // and an amount of 1000
   * Dinero.normalizePrecision([
   *   Dinero({ amount: 100, precision: 2 }),
   *   Dinero({ amount: 1000, precision: 3 })
   * ])
   *
   * @return {Dinero[]}
   */
  normalizePrecision: function normalizePrecision(objects) {
    var highestPrecision = objects.reduce(function(a, b) {
      return Math.max(a.getPrecision(), b.getPrecision());
    });
    return objects.map(function(object) {
      return object.getPrecision() !== highestPrecision ? object.convertPrecision(highestPrecision) : object;
    });
  },
  /**
   * Returns the smallest Dinero object from an array of Dinero objects
   *
   * @memberof module:Dinero
   * @method
   *
   * @param {Dinero[]} objects - An array of Dinero objects
   *
   * @example
   * // returns the smallest Dinero object with amount of 500 from an array of Dinero objects with different precisions
   * Dinero.minimum([
   *   Dinero({ amount: 500, precision: 3 }),
   *   Dinero({ amount: 100, precision: 2 })
   * ])
   * @example
   * // returns the smallest Dinero object with amount of 50 from an array of Dinero objects
   * Dinero.minimum([
   *   Dinero({ amount: 50 }),
   *   Dinero({ amount: 100 })
   * ])
   *
   * @return {Dinero[]}
   */
  minimum: function minimum(objects) {
    var _objects = _toArray(objects), firstObject = _objects[0], tailObjects = _objects.slice(1);
    var currentMinimum = firstObject;
    tailObjects.forEach(function(obj) {
      currentMinimum = currentMinimum.lessThan(obj) ? currentMinimum : obj;
    });
    return currentMinimum;
  },
  /**
   * Returns the biggest Dinero object from an array of Dinero objects
   *
   * @memberof module:Dinero
   * @method
   *
   * @param {Dinero[]} objects - An array of Dinero objects
   *
   * @example
   * // returns the biggest Dinero object with amount of 20, from an array of Dinero objects with different precisions
   * Dinero.maximum([
   *   Dinero({ amount: 20, precision: 2 }),
   *   Dinero({ amount: 150, precision: 3 })
   * ])
   * @example
   * // returns the biggest Dinero object with amount of 100, from an array of Dinero objects
   * Dinero.maximum([
   *   Dinero({ amount: 100 }),
   *   Dinero({ amount: 50 })
   * ])
   *
   * @return {Dinero[]}
   */
  maximum: function maximum(objects) {
    var _objects2 = _toArray(objects), firstObject = _objects2[0], tailObjects = _objects2.slice(1);
    var currentMaximum = firstObject;
    tailObjects.forEach(function(obj) {
      currentMaximum = currentMaximum.greaterThan(obj) ? currentMaximum : obj;
    });
    return currentMaximum;
  }
};
function isNumeric(value) {
  return !isNaN(parseInt(value)) && isFinite(value);
}
function isPercentage(percentage) {
  return isNumeric(percentage) && percentage <= 100 && percentage >= 0;
}
function areValidRatios(ratios) {
  return ratios.length > 0 && ratios.every(function(ratio) {
    return ratio >= 0;
  }) && ratios.some(function(ratio) {
    return ratio > 0;
  });
}
function isEven(value) {
  return value % 2 === 0;
}
function isFloat(value) {
  return isNumeric(value) && !Number.isInteger(value);
}
function countFractionDigits() {
  var number = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
  var stringRepresentation = number.toString();
  if (stringRepresentation.indexOf("e-") > 0) {
    return parseInt(stringRepresentation.split("e-")[1]);
  } else {
    var fractionDigits = stringRepresentation.split(".")[1];
    return fractionDigits ? fractionDigits.length : 0;
  }
}
function isHalf(number) {
  return Math.abs(number) % 1 === 0.5;
}
function getJSON(url) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return new Promise(function(resolve, reject) {
    var request = Object.assign(new XMLHttpRequest(), {
      onreadystatechange: function onreadystatechange() {
        if (request.readyState === 4) {
          if (request.status >= 200 && request.status < 400) resolve(JSON.parse(request.responseText));
          else reject(new Error(request.statusText));
        }
      },
      onerror: function onerror() {
        reject(new Error("Network error"));
      }
    });
    request.open("GET", url, true);
    setXHRHeaders(request, options.headers);
    request.send();
  });
}
function setXHRHeaders(xhr) {
  var headers = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  for (var header2 in headers) {
    xhr.setRequestHeader(header2, headers[header2]);
  }
  return xhr;
}
function isUndefined(value) {
  return typeof value === "undefined";
}
function flattenObject(object) {
  var separator = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : ".";
  var finalObject = {};
  Object.entries(object).forEach(function(item) {
    if (_typeof(item[1]) === "object") {
      var flatObject = flattenObject(item[1]);
      Object.entries(flatObject).forEach(function(node) {
        finalObject[item[0] + separator + node[0]] = node[1];
      });
    } else {
      finalObject[item[0]] = item[1];
    }
  });
  return finalObject;
}
function isThenable(value) {
  return Boolean(value) && (_typeof(value) === "object" || typeof value === "function") && typeof value.then === "function";
}
function Calculator() {
  var floatMultiply = function floatMultiply2(a, b) {
    var getFactor = function getFactor2(number) {
      return Math.pow(10, countFractionDigits(number));
    };
    var factor = Math.max(getFactor(a), getFactor(b));
    return Math.round(a * factor) * Math.round(b * factor) / (factor * factor);
  };
  var roundingModes = {
    HALF_ODD: function HALF_ODD(number) {
      var rounded = Math.round(number);
      return isHalf(number) ? isEven(rounded) ? rounded - 1 : rounded : rounded;
    },
    HALF_EVEN: function HALF_EVEN(number) {
      var rounded = Math.round(number);
      return isHalf(number) ? isEven(rounded) ? rounded : rounded - 1 : rounded;
    },
    HALF_UP: function HALF_UP(number) {
      return Math.round(number);
    },
    HALF_DOWN: function HALF_DOWN(number) {
      return isHalf(number) ? Math.floor(number) : Math.round(number);
    },
    HALF_TOWARDS_ZERO: function HALF_TOWARDS_ZERO(number) {
      return isHalf(number) ? Math.sign(number) * Math.floor(Math.abs(number)) : Math.round(number);
    },
    HALF_AWAY_FROM_ZERO: function HALF_AWAY_FROM_ZERO(number) {
      return isHalf(number) ? Math.sign(number) * Math.ceil(Math.abs(number)) : Math.round(number);
    },
    DOWN: function DOWN(number) {
      return Math.floor(number);
    }
  };
  return {
    /**
     * Returns the sum of two numbers.
     * @ignore
     *
     * @param {Number} a - The first number to add.
     * @param {Number} b - The second number to add.
     *
     * @return {Number}
     */
    add: function add(a, b) {
      return a + b;
    },
    /**
     * Returns the difference of two numbers.
     * @ignore
     *
     * @param {Number} a - The first number to subtract.
     * @param {Number} b - The second number to subtract.
     *
     * @return {Number}
     */
    subtract: function subtract(a, b) {
      return a - b;
    },
    /**
     * Returns the product of two numbers.
     * @ignore
     *
     * @param {Number} a - The first number to multiply.
     * @param {Number} b - The second number to multiply.
     *
     * @return {Number}
     */
    multiply: function multiply(a, b) {
      return isFloat(a) || isFloat(b) ? floatMultiply(a, b) : a * b;
    },
    /**
     * Returns the quotient of two numbers.
     * @ignore
     *
     * @param {Number} a - The first number to divide.
     * @param {Number} b - The second number to divide.
     *
     * @return {Number}
     */
    divide: function divide(a, b) {
      return a / b;
    },
    /**
     * Returns the remainder of two numbers.
     * @ignore
     *
     * @param  {Number} a - The first number to divide.
     * @param  {Number} b - The second number to divide.
     *
     * @return {Number}
     */
    modulo: function modulo(a, b) {
      return a % b;
    },
    /**
     * Returns a rounded number based off a specific rounding mode.
     * @ignore
     *
     * @param {Number} number - The number to round.
     * @param {String} [roundingMode='HALF_EVEN'] - The rounding mode to use.
     *
     * @returns {Number}
     */
    round: function round(number) {
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "HALF_EVEN";
      return roundingModes[roundingMode](number);
    }
  };
}
var calculator = Calculator();
function Format(format) {
  var matches = /^(?:(\$|USD)?0(?:(,)0)?(\.)?(0+)?|0(?:(,)0)?(\.)?(0+)?\s?(dollar)?)$/gm.exec(format);
  return {
    /**
     * Returns the matches.
     * @ignore
     *
     * @return {Array}
     */
    getMatches: function getMatches() {
      return matches !== null ? matches.slice(1).filter(function(match) {
        return !isUndefined(match);
      }) : [];
    },
    /**
     * Returns the amount of fraction digits to display.
     * @ignore
     *
     * @return {Number}
     */
    getMinimumFractionDigits: function getMinimumFractionDigits() {
      var decimalPosition = function decimalPosition2(match) {
        return match === ".";
      };
      return !isUndefined(this.getMatches().find(decimalPosition)) ? this.getMatches()[calculator.add(this.getMatches().findIndex(decimalPosition), 1)].split("").length : 0;
    },
    /**
     * Returns the currency display mode.
     * @ignore
     *
     * @return {String}
     */
    getCurrencyDisplay: function getCurrencyDisplay() {
      var modes = {
        USD: "code",
        dollar: "name",
        $: "symbol"
      };
      return modes[this.getMatches().find(function(match) {
        return match === "USD" || match === "dollar" || match === "$";
      })];
    },
    /**
     * Returns the formatting style.
     * @ignore
     *
     * @return {String}
     */
    getStyle: function getStyle() {
      return !isUndefined(this.getCurrencyDisplay(this.getMatches())) ? "currency" : "decimal";
    },
    /**
     * Returns whether grouping should be used or not.
     * @ignore
     *
     * @return {Boolean}
     */
    getUseGrouping: function getUseGrouping() {
      return !isUndefined(this.getMatches().find(function(match) {
        return match === ",";
      }));
    }
  };
}
function CurrencyConverter(options) {
  var mergeTags = function mergeTags2() {
    var string = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
    var tags = arguments.length > 1 ? arguments[1] : void 0;
    for (var tag in tags) {
      string = string.replace("{{".concat(tag, "}}"), tags[tag]);
    }
    return string;
  };
  var getRatesFromRestApi = function getRatesFromRestApi2(from, to) {
    return getJSON(mergeTags(options.endpoint, {
      from,
      to
    }), {
      headers: options.headers
    });
  };
  return {
    /**
     * Returns the exchange rate.
     * @ignore
     *
     * @param  {String} from - The base currency.
     * @param  {String} to   - The destination currency.
     *
     * @return {Promise}
     */
    getExchangeRate: function getExchangeRate(from, to) {
      return (isThenable(options.endpoint) ? options.endpoint : getRatesFromRestApi(from, to)).then(function(data) {
        return flattenObject(data)[mergeTags(options.propertyPath, {
          from,
          to
        })];
      });
    }
  };
}
function assert(condition, errorMessage) {
  var ErrorType = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Error;
  if (!condition) throw new ErrorType(errorMessage);
}
function assertPercentage(percentage) {
  assert(isPercentage(percentage), "You must provide a numeric value between 0 and 100.", RangeError);
}
function assertValidRatios(ratios) {
  assert(areValidRatios(ratios), "You must provide a non-empty array of numeric values greater than 0.", TypeError);
}
function assertInteger(number) {
  assert(Number.isInteger(number), "You must provide an integer.", TypeError);
}
var calculator$1 = Calculator();
var Dinero = function Dinero2(options) {
  var _Object$assign = Object.assign({}, {
    amount: Dinero2.defaultAmount,
    currency: Dinero2.defaultCurrency,
    precision: Dinero2.defaultPrecision
  }, options), amount = _Object$assign.amount, currency = _Object$assign.currency, precision = _Object$assign.precision;
  assertInteger(amount);
  assertInteger(precision);
  var globalLocale = Dinero2.globalLocale, globalFormat = Dinero2.globalFormat, globalRoundingMode = Dinero2.globalRoundingMode, globalFormatRoundingMode = Dinero2.globalFormatRoundingMode;
  var globalExchangeRatesApi = Object.assign({}, Dinero2.globalExchangeRatesApi);
  var create = function create2(options2) {
    var obj = Object.assign({}, Object.assign({}, {
      amount,
      currency,
      precision
    }, options2), Object.assign({}, {
      locale: this.locale
    }, options2));
    return Object.assign(Dinero2({
      amount: obj.amount,
      currency: obj.currency,
      precision: obj.precision
    }), {
      locale: obj.locale
    });
  };
  var assertSameCurrency = function assertSameCurrency2(comparator) {
    assert(this.hasSameCurrency(comparator), "You must provide a Dinero instance with the same currency.", TypeError);
  };
  return {
    /**
     * Returns the amount.
     *
     * @example
     * // returns 500
     * Dinero({ amount: 500 }).getAmount()
     *
     * @return {Number}
     */
    getAmount: function getAmount() {
      return amount;
    },
    /**
     * Returns the currency.
     *
     * @example
     * // returns 'EUR'
     * Dinero({ currency: 'EUR' }).getCurrency()
     *
     * @return {String}
     */
    getCurrency: function getCurrency() {
      return currency;
    },
    /**
     * Returns the locale.
     *
     * @example
     * // returns 'fr-FR'
     * Dinero().setLocale('fr-FR').getLocale()
     *
     * @return {String}
     */
    getLocale: function getLocale() {
      return this.locale || globalLocale;
    },
    /**
     * Returns a new Dinero object with an embedded locale.
     *
     * @param {String} newLocale - The new locale as an {@link http://tools.ietf.org/html/rfc5646 BCP 47 language tag}.
     *
     * @example
     * // Returns a Dinero object with locale 'ja-JP'
     * Dinero().setLocale('ja-JP')
     *
     * @return {Dinero}
     */
    setLocale: function setLocale(newLocale) {
      return create.call(this, {
        locale: newLocale
      });
    },
    /**
     * Returns the precision.
     *
     * @example
     * // returns 3
     * Dinero({ precision: 3 }).getPrecision()
     *
     * @return {Number}
     */
    getPrecision: function getPrecision() {
      return precision;
    },
    /**
     * Returns a new Dinero object with a new precision and a converted amount.
     *
     * By default, fractional minor currency units are rounded using the **half to even** rule ([banker's rounding](http://wiki.c2.com/?BankersRounding)).
     * This can be necessary when you need to convert objects to a smaller precision.
     *
     * Rounding *can* lead to accuracy issues as you chain many times. Consider a minimal amount of subsequent conversions for safer results.
     * You can also specify a different `roundingMode` to better fit your needs.
     *
     * @param {Number} newPrecision - The new precision.
     * @param {String} [roundingMode='HALF_EVEN'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @example
     * // Returns a Dinero object with precision 3 and amount 1000
     * Dinero({ amount: 100, precision: 2 }).convertPrecision(3)
     *
     * @throws {TypeError} If `newPrecision` is invalid.
     *
     * @return {Dinero}
     */
    convertPrecision: function convertPrecision(newPrecision) {
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : globalFormatRoundingMode;
      assertInteger(newPrecision);
      var precision2 = this.getPrecision();
      var isNewPrecisionLarger = newPrecision > precision2;
      var operation = isNewPrecisionLarger ? calculator$1.multiply : calculator$1.divide;
      var terms = isNewPrecisionLarger ? [newPrecision, precision2] : [precision2, newPrecision];
      var factor = Math.pow(10, calculator$1.subtract.apply(calculator$1, terms));
      return create.call(this, {
        amount: calculator$1.round(operation(this.getAmount(), factor), roundingMode),
        precision: newPrecision
      });
    },
    /**
     * Returns a new Dinero object that represents the sum of this and an other Dinero object.
     *
     * If Dinero objects have a different `precision`, they will be first converted to the highest.
     *
     * @param {Dinero} addend - The Dinero object to add.
     *
     * @example
     * // returns a Dinero object with amount 600
     * Dinero({ amount: 400 }).add(Dinero({ amount: 200 }))
     * @example
     * // returns a Dinero object with amount 144545 and precision 4
     * Dinero({ amount: 400 }).add(Dinero({ amount: 104545, precision: 4 }))
     *
     * @throws {TypeError} If `addend` has a different currency.
     *
     * @return {Dinero}
     */
    add: function add(addend) {
      assertSameCurrency.call(this, addend);
      var addends = Dinero2.normalizePrecision([this, addend]);
      return create.call(this, {
        amount: calculator$1.add(addends[0].getAmount(), addends[1].getAmount()),
        precision: addends[0].getPrecision()
      });
    },
    /**
     * Returns a new Dinero object that represents the difference of this and an other Dinero object.
     *
     * If Dinero objects have a different `precision`, they will be first converted to the highest.
     *
     * @param  {Dinero} subtrahend - The Dinero object to subtract.
     *
     * @example
     * // returns a Dinero object with amount 200
     * Dinero({ amount: 400 }).subtract(Dinero({ amount: 200 }))
     * @example
     * // returns a Dinero object with amount 64545 and precision 4
     * Dinero({ amount: 104545, precision: 4 }).subtract(Dinero({ amount: 400 }))
     *
     * @throws {TypeError} If `subtrahend` has a different currency.
     *
     * @return {Dinero}
     */
    subtract: function subtract(subtrahend) {
      assertSameCurrency.call(this, subtrahend);
      var subtrahends = Dinero2.normalizePrecision([this, subtrahend]);
      return create.call(this, {
        amount: calculator$1.subtract(subtrahends[0].getAmount(), subtrahends[1].getAmount()),
        precision: subtrahends[0].getPrecision()
      });
    },
    /**
     * Returns a new Dinero object that represents the multiplied value by the given factor.
     *
     * By default, fractional minor currency units are rounded using the **half to even** rule ([banker's rounding](http://wiki.c2.com/?BankersRounding)).
     *
     * Rounding *can* lead to accuracy issues as you chain many times. Consider a minimal amount of subsequent calculations for safer results.
     * You can also specify a different `roundingMode` to better fit your needs.
     *
     * @param  {Number} multiplier - The factor to multiply by.
     * @param  {String} [roundingMode='HALF_EVEN'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @example
     * // returns a Dinero object with amount 1600
     * Dinero({ amount: 400 }).multiply(4)
     * @example
     * // returns a Dinero object with amount 800
     * Dinero({ amount: 400 }).multiply(2.001)
     * @example
     * // returns a Dinero object with amount 801
     * Dinero({ amount: 400 }).multiply(2.00125, 'HALF_UP')
     *
     * @return {Dinero}
     */
    multiply: function multiply(multiplier) {
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : globalRoundingMode;
      return create.call(this, {
        amount: calculator$1.round(calculator$1.multiply(this.getAmount(), multiplier), roundingMode)
      });
    },
    /**
     * Returns a new Dinero object that represents the divided value by the given factor.
     *
     * By default, fractional minor currency units are rounded using the **half to even** rule ([banker's rounding](http://wiki.c2.com/?BankersRounding)).
     *
     * Rounding *can* lead to accuracy issues as you chain many times. Consider a minimal amount of subsequent calculations for safer results.
     * You can also specify a different `roundingMode` to better fit your needs.
     *
     * As rounding is applied, precision may be lost in the process. If you want to accurately split a Dinero object, use {@link module:Dinero~allocate allocate} instead.
     *
     * @param  {Number} divisor - The factor to divide by.
     * @param  {String} [roundingMode='HALF_EVEN'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @example
     * // returns a Dinero object with amount 100
     * Dinero({ amount: 400 }).divide(4)
     * @example
     * // returns a Dinero object with amount 52
     * Dinero({ amount: 105 }).divide(2)
     * @example
     * // returns a Dinero object with amount 53
     * Dinero({ amount: 105 }).divide(2, 'HALF_UP')
     *
     * @return {Dinero}
     */
    divide: function divide(divisor) {
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : globalRoundingMode;
      return create.call(this, {
        amount: calculator$1.round(calculator$1.divide(this.getAmount(), divisor), roundingMode)
      });
    },
    /**
     * Returns a new Dinero object that represents a percentage of this.
     *
     * As rounding is applied, precision may be lost in the process. If you want to accurately split a Dinero object, use {@link module:Dinero~allocate allocate} instead.
     *
     * @param  {Number} percentage - The percentage to extract (between 0 and 100).
     * @param  {String} [roundingMode='HALF_EVEN'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @example
     * // returns a Dinero object with amount 5000
     * Dinero({ amount: 10000 }).percentage(50)
     * @example
     * // returns a Dinero object with amount 29
     * Dinero({ amount: 57 }).percentage(50, "HALF_ODD")
     *
     * @throws {RangeError} If `percentage` is out of range.
     *
     * @return {Dinero}
     */
    percentage: function percentage(_percentage) {
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : globalRoundingMode;
      assertPercentage(_percentage);
      return this.multiply(calculator$1.divide(_percentage, 100), roundingMode);
    },
    /**
     * Allocates the amount of a Dinero object according to a list of ratios.
     *
     * Sometimes you need to split monetary values but percentages can't cut it without adding or losing pennies.
     * A good example is invoicing: let's say you need to bill $1,000.03 and you want a 50% downpayment.
     * If you use {@link module:Dinero~percentage percentage}, you'll get an accurate Dinero object but the amount won't be billable: you can't split a penny.
     * If you round it, you'll bill a penny extra.
     * With {@link module:Dinero~allocate allocate}, you can split a monetary amount then distribute the remainder as evenly as possible.
     *
     * You can use percentage style or ratio style for `ratios`: `[25, 75]` and `[1, 3]` will do the same thing.
     *
     * Since v1.8.0, you can use zero ratios (such as [0, 50, 50]). If there's a remainder to distribute, zero ratios are skipped and return a Dinero object with amount zero.
     *
     * @param  {Number[]} ratios - The ratios to allocate the money to.
     *
     * @example
     * // returns an array of two Dinero objects
     * // the first one with an amount of 502
     * // the second one with an amount of 501
     * Dinero({ amount: 1003 }).allocate([50, 50])
     * @example
     * // returns an array of two Dinero objects
     * // the first one with an amount of 25
     * // the second one with an amount of 75
     * Dinero({ amount: 100 }).allocate([1, 3])
     * @example
     * // since version 1.8.0
     * // returns an array of three Dinero objects
     * // the first one with an amount of 0
     * // the second one with an amount of 502
     * // the third one with an amount of 501
     * Dinero({ amount: 1003 }).allocate([0, 50, 50])
     *
     * @throws {TypeError} If ratios are invalid.
     *
     * @return {Dinero[]}
     */
    allocate: function allocate(ratios) {
      var _this = this;
      assertValidRatios(ratios);
      var total = ratios.reduce(function(a, b) {
        return calculator$1.add(a, b);
      });
      var remainder = this.getAmount();
      var shares = ratios.map(function(ratio) {
        var share = Math.floor(calculator$1.divide(calculator$1.multiply(_this.getAmount(), ratio), total));
        remainder = calculator$1.subtract(remainder, share);
        return create.call(_this, {
          amount: share
        });
      });
      var i = 0;
      while (remainder > 0) {
        if (ratios[i] > 0) {
          shares[i] = shares[i].add(create.call(this, {
            amount: 1
          }));
          remainder = calculator$1.subtract(remainder, 1);
        }
        i += 1;
      }
      return shares;
    },
    /**
     * Returns a Promise containing a new Dinero object converted to another currency.
     *
     * You have two options to provide the exchange rates:
     *
     * 1. **Use an exchange rate REST API, and let Dinero handle the fetching and conversion.**
     *   This is a simple option if you have access to an exchange rate REST API and want Dinero to do the rest.
     * 2. **Fetch the exchange rates on your own and provide them directly.**
     *   This is useful if you're fetching your rates from somewhere else (a file, a database), use a different protocol or query language than REST (SOAP, GraphQL) or want to fetch rates once and cache them instead of making new requests every time.
     *
     * **If you want to use a REST API**, you must provide a third-party endpoint yourself. Dinero doesn't come bundled with an exchange rates endpoint.
     *
     * Here are some exchange rate APIs you can use:
     *
     * * [Fixer](https://fixer.io)
     * * [Open Exchange Rates](https://openexchangerates.org)
     * * [Coinbase](https://api.coinbase.com/v2/exchange-rates)
     * * More [foreign](https://github.com/toddmotto/public-apis#currency-exchange) and [crypto](https://github.com/toddmotto/public-apis#cryptocurrency) exchange rate APIs.
     *
     * **If you want to fetch your own rates and provide them directly**, you need to pass a promise that resolves to the exchanges rates.
     *
     * In both cases, you need to specify at least:
     *
     * * a **destination currency**: the currency in which you want to convert your Dinero object. You can specify it with `currency`.
     * * an **endpoint**: the API URL to query exchange rates, with parameters, or a promise that resolves to the exchange rates. You can specify it with `options.endpoint`.
     * * a **property path**: the path to access the wanted rate in your API's JSON response (or the custom promise's payload). For example, with a response of:
     * ```json
     * {
     *     "data": {
     *       "base": "USD",
     *       "destination": "EUR",
     *       "rate": "0.827728919"
     *     }
     * }
     * ```
     * Then the property path is `'data.rate'`. You can specify it with `options.propertyPath`.
     *
     * The base currency (the one of your Dinero object) and the destination currency can be used as "merge tags" with the mustache syntax, respectively `{{from}}` and `{{to}}`.
     * You can use these tags to refer to these values in `options.endpoint` and `options.propertyPath`.
     *
     * For example, if you need to specify the base currency as a query parameter, you can do the following:
     *
     * ```js
     * {
     *   endpoint: 'https://yourexchangerates.api/latest?base={{from}}'
     * }
     * ```
     *
     * @param  {String} currency - The destination currency, expressed as an {@link https://en.wikipedia.org/wiki/ISO_4217#Active_codes ISO 4217 currency code}.
     * @param  {(String|Promise)} options.endpoint - The API endpoint to retrieve exchange rates. You can substitute this with a promise that resolves to the exchanges rates if you already have them.
     * @param  {String} [options.propertyPath='rates.{{to}}'] - The property path to the rate.
     * @param  {Object} [options.headers] - The HTTP headers to provide, if needed.
     * @param  {String} [options.roundingMode='HALF_EVEN'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @example
     * // your global API parameters
     * Dinero.globalExchangeRatesApi = { ... }
     *
     * // returns a Promise containing a Dinero object with the destination currency
     * // and the initial amount converted to the new currency.
     * Dinero({ amount: 500 }).convert('EUR')
     * @example
     * // returns a Promise containing a Dinero object,
     * // with specific API parameters and rounding mode for this specific instance.
     * Dinero({ amount: 500 })
     *   .convert('XBT', {
     *     endpoint: 'https://yourexchangerates.api/latest?base={{from}}',
     *     propertyPath: 'data.rates.{{to}}',
     *     headers: {
     *       'user-key': 'xxxxxxxxx'
     *     },
     *     roundingMode: 'HALF_UP'
     *   })
     * @example
     * // usage with exchange rates provided as a custom promise
     * // using the default `propertyPath` format (so it doesn't have to be specified)
     * const rates = {
     *   rates: {
     *     EUR: 0.81162
     *   }
     * }
     *
     * Dinero({ amount: 500 })
     *   .convert('EUR', {
     *     endpoint: new Promise(resolve => resolve(rates))
     *   })
     * @example
     * // usage with Promise.prototype.then and Promise.prototype.catch
     * Dinero({ amount: 500 })
     *   .convert('EUR')
     *   .then(dinero => {
     *     dinero.getCurrency() // returns 'EUR'
     *   })
     *   .catch(err => {
     *     // handle errors
     *   })
     * @example
     * // usage with async/await
     * (async () => {
     *   const price = await Dinero({ amount: 500 }).convert('EUR')
     *   price.getCurrency() // returns 'EUR'
     * })()
     *
     * @return {Promise}
     */
    convert: function convert(currency2) {
      var _this2 = this;
      var _ref = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, _ref$endpoint = _ref.endpoint, endpoint = _ref$endpoint === void 0 ? globalExchangeRatesApi.endpoint : _ref$endpoint, _ref$propertyPath = _ref.propertyPath, propertyPath = _ref$propertyPath === void 0 ? globalExchangeRatesApi.propertyPath || "rates.{{to}}" : _ref$propertyPath, _ref$headers = _ref.headers, headers = _ref$headers === void 0 ? globalExchangeRatesApi.headers : _ref$headers, _ref$roundingMode = _ref.roundingMode, roundingMode = _ref$roundingMode === void 0 ? globalRoundingMode : _ref$roundingMode;
      var options2 = Object.assign({}, {
        endpoint,
        propertyPath,
        headers,
        roundingMode
      });
      return CurrencyConverter(options2).getExchangeRate(this.getCurrency(), currency2).then(function(rate) {
        assert(!isUndefined(rate), 'No rate was found for the destination currency "'.concat(currency2, '".'), TypeError);
        return create.call(_this2, {
          amount: calculator$1.round(calculator$1.multiply(_this2.getAmount(), parseFloat(rate)), options2.roundingMode),
          currency: currency2
        });
      });
    },
    /**
     * Checks whether the value represented by this object equals to the other.
     *
     * @param  {Dinero} comparator - The Dinero object to compare to.
     *
     * @example
     * // returns true
     * Dinero({ amount: 500, currency: 'EUR' }).equalsTo(Dinero({ amount: 500, currency: 'EUR' }))
     * @example
     * // returns false
     * Dinero({ amount: 500, currency: 'EUR' }).equalsTo(Dinero({ amount: 800, currency: 'EUR' }))
     * @example
     * // returns false
     * Dinero({ amount: 500, currency: 'USD' }).equalsTo(Dinero({ amount: 500, currency: 'EUR' }))
     * @example
     * // returns false
     * Dinero({ amount: 500, currency: 'USD' }).equalsTo(Dinero({ amount: 800, currency: 'EUR' }))
     * @example
     * // returns true
     * Dinero({ amount: 1000, currency: 'EUR', precision: 2 }).equalsTo(Dinero({ amount: 10000, currency: 'EUR', precision: 3 }))
     * @example
     * // returns false
     * Dinero({ amount: 10000, currency: 'EUR', precision: 2 }).equalsTo(Dinero({ amount: 10000, currency: 'EUR', precision: 3 }))
     *
     * @return {Boolean}
     */
    equalsTo: function equalsTo(comparator) {
      return this.hasSameAmount(comparator) && this.hasSameCurrency(comparator);
    },
    /**
     * Checks whether the value represented by this object is less than the other.
     *
     * @param  {Dinero} comparator - The Dinero object to compare to.
     *
     * @example
     * // returns true
     * Dinero({ amount: 500 }).lessThan(Dinero({ amount: 800 }))
     * @example
     * // returns false
     * Dinero({ amount: 800 }).lessThan(Dinero({ amount: 500 }))
     * @example
     * // returns true
     * Dinero({ amount: 5000, precision: 3 }).lessThan(Dinero({ amount: 800 }))
     * @example
     * // returns false
     * Dinero({ amount: 800 }).lessThan(Dinero({ amount: 5000, precision: 3 }))
     *
     * @throws {TypeError} If `comparator` has a different currency.
     *
     * @return {Boolean}
     */
    lessThan: function lessThan(comparator) {
      assertSameCurrency.call(this, comparator);
      var comparators = Dinero2.normalizePrecision([this, comparator]);
      return comparators[0].getAmount() < comparators[1].getAmount();
    },
    /**
     * Checks whether the value represented by this object is less than or equal to the other.
     *
     * @param  {Dinero} comparator - The Dinero object to compare to.
     *
     * @example
     * // returns true
     * Dinero({ amount: 500 }).lessThanOrEqual(Dinero({ amount: 800 }))
     * @example
     * // returns true
     * Dinero({ amount: 500 }).lessThanOrEqual(Dinero({ amount: 500 }))
     * @example
     * // returns false
     * Dinero({ amount: 500 }).lessThanOrEqual(Dinero({ amount: 300 }))
     * @example
     * // returns true
     * Dinero({ amount: 5000, precision: 3 }).lessThanOrEqual(Dinero({ amount: 800 }))
     * @example
     * // returns true
     * Dinero({ amount: 5000, precision: 3 }).lessThanOrEqual(Dinero({ amount: 500 }))
     * @example
     * // returns false
     * Dinero({ amount: 800 }).lessThanOrEqual(Dinero({ amount: 5000, precision: 3 }))
     *
     * @throws {TypeError} If `comparator` has a different currency.
     *
     * @return {Boolean}
     */
    lessThanOrEqual: function lessThanOrEqual(comparator) {
      assertSameCurrency.call(this, comparator);
      var comparators = Dinero2.normalizePrecision([this, comparator]);
      return comparators[0].getAmount() <= comparators[1].getAmount();
    },
    /**
     * Checks whether the value represented by this object is greater than the other.
     *
     * @param  {Dinero} comparator - The Dinero object to compare to.
     *
     * @example
     * // returns false
     * Dinero({ amount: 500 }).greaterThan(Dinero({ amount: 800 }))
     * @example
     * // returns true
     * Dinero({ amount: 800 }).greaterThan(Dinero({ amount: 500 }))
     * @example
     * // returns true
     * Dinero({ amount: 800 }).greaterThan(Dinero({ amount: 5000, precision: 3 }))
     * @example
     * // returns false
     * Dinero({ amount: 5000, precision: 3 }).greaterThan(Dinero({ amount: 800 }))
     *
     * @throws {TypeError} If `comparator` has a different currency.
     *
     * @return {Boolean}
     */
    greaterThan: function greaterThan(comparator) {
      assertSameCurrency.call(this, comparator);
      var comparators = Dinero2.normalizePrecision([this, comparator]);
      return comparators[0].getAmount() > comparators[1].getAmount();
    },
    /**
     * Checks whether the value represented by this object is greater than or equal to the other.
     *
     * @param  {Dinero} comparator - The Dinero object to compare to.
     *
     * @example
     * // returns true
     * Dinero({ amount: 500 }).greaterThanOrEqual(Dinero({ amount: 300 }))
     * @example
     * // returns true
     * Dinero({ amount: 500 }).greaterThanOrEqual(Dinero({ amount: 500 }))
     * @example
     * // returns false
     * Dinero({ amount: 500 }).greaterThanOrEqual(Dinero({ amount: 800 }))
     * @example
     * // returns true
     * Dinero({ amount: 800 }).greaterThanOrEqual(Dinero({ amount: 5000, precision: 3 }))
     * @example
     * // returns true
     * Dinero({ amount: 500 }).greaterThanOrEqual(Dinero({ amount: 5000, precision: 3 }))
     * @example
     * // returns false
     * Dinero({ amount: 5000, precision: 3 }).greaterThanOrEqual(Dinero({ amount: 800 }))
     *
     * @throws {TypeError} If `comparator` has a different currency.
     *
     * @return {Boolean}
     */
    greaterThanOrEqual: function greaterThanOrEqual(comparator) {
      assertSameCurrency.call(this, comparator);
      var comparators = Dinero2.normalizePrecision([this, comparator]);
      return comparators[0].getAmount() >= comparators[1].getAmount();
    },
    /**
     * Checks if the value represented by this object is zero.
     *
     * @example
     * // returns true
     * Dinero({ amount: 0 }).isZero()
     * @example
     * // returns false
     * Dinero({ amount: 100 }).isZero()
     *
     * @return {Boolean}
     */
    isZero: function isZero() {
      return this.getAmount() === 0;
    },
    /**
     * Checks if the value represented by this object is positive.
     *
     * @example
     * // returns false
     * Dinero({ amount: -10 }).isPositive()
     * @example
     * // returns true
     * Dinero({ amount: 10 }).isPositive()
     * @example
     * // returns true
     * Dinero({ amount: 0 }).isPositive()
     *
     * @return {Boolean}
     */
    isPositive: function isPositive() {
      return this.getAmount() >= 0;
    },
    /**
     * Checks if the value represented by this object is negative.
     *
     * @example
     * // returns true
     * Dinero({ amount: -10 }).isNegative()
     * @example
     * // returns false
     * Dinero({ amount: 10 }).isNegative()
     * @example
     * // returns false
     * Dinero({ amount: 0 }).isNegative()
     *
     * @return {Boolean}
     */
    isNegative: function isNegative() {
      return this.getAmount() < 0;
    },
    /**
     * Checks if this has minor currency units.
     * Deprecates {@link module:Dinero~hasCents hasCents}.
     *
     * @example
     * // returns false
     * Dinero({ amount: 1100 }).hasSubUnits()
     * @example
     * // returns true
     * Dinero({ amount: 1150 }).hasSubUnits()
     *
     * @return {Boolean}
     */
    hasSubUnits: function hasSubUnits() {
      return calculator$1.modulo(this.getAmount(), Math.pow(10, precision)) !== 0;
    },
    /**
     * Checks if this has minor currency units.
     *
     * @deprecated since version 1.4.0, will be removed in 2.0.0
     * Use {@link module:Dinero~hasSubUnits hasSubUnits} instead.
     *
     * @example
     * // returns false
     * Dinero({ amount: 1100 }).hasCents()
     * @example
     * // returns true
     * Dinero({ amount: 1150 }).hasCents()
     *
     * @return {Boolean}
     */
    hasCents: function hasCents() {
      return calculator$1.modulo(this.getAmount(), Math.pow(10, precision)) !== 0;
    },
    /**
     * Checks whether the currency represented by this object equals to the other.
     *
     * @param  {Dinero}  comparator - The Dinero object to compare to.
     *
     * @example
     * // returns true
     * Dinero({ amount: 2000, currency: 'EUR' }).hasSameCurrency(Dinero({ amount: 1000, currency: 'EUR' }))
     * @example
     * // returns false
     * Dinero({ amount: 1000, currency: 'EUR' }).hasSameCurrency(Dinero({ amount: 1000, currency: 'USD' }))
     *
     * @return {Boolean}
     */
    hasSameCurrency: function hasSameCurrency(comparator) {
      return this.getCurrency() === comparator.getCurrency();
    },
    /**
     * Checks whether the amount represented by this object equals to the other.
     *
     * @param  {Dinero}  comparator - The Dinero object to compare to.
     *
     * @example
     * // returns true
     * Dinero({ amount: 1000, currency: 'EUR' }).hasSameAmount(Dinero({ amount: 1000 }))
     * @example
     * // returns false
     * Dinero({ amount: 2000, currency: 'EUR' }).hasSameAmount(Dinero({ amount: 1000, currency: 'EUR' }))
     * @example
     * // returns true
     * Dinero({ amount: 1000, currency: 'EUR', precision: 2 }).hasSameAmount(Dinero({ amount: 10000, precision: 3 }))
     * @example
     * // returns false
     * Dinero({ amount: 10000, currency: 'EUR', precision: 2 }).hasSameAmount(Dinero({ amount: 10000, precision: 3 }))
     *
     * @return {Boolean}
     */
    hasSameAmount: function hasSameAmount(comparator) {
      var comparators = Dinero2.normalizePrecision([this, comparator]);
      return comparators[0].getAmount() === comparators[1].getAmount();
    },
    /**
     * Returns this object formatted as a string.
     *
     * The format is a mask which defines how the output string will be formatted.
     * It defines whether to display a currency, in what format, how many fraction digits to display and whether to use grouping separators.
     * The output is formatted according to the applying locale.
     *
     * Object                       | Format            | String
     * :--------------------------- | :---------------- | :---
     * `Dinero({ amount: 500050 })` | `'$0,0.00'`       | $5,000.50
     * `Dinero({ amount: 500050 })` | `'$0,0'`          | $5,001
     * `Dinero({ amount: 500050 })` | `'$0'`            | $5001
     * `Dinero({ amount: 500050 })` | `'$0.0'`          | $5000.5
     * `Dinero({ amount: 500050 })` | `'USD0,0.0'`      | USD5,000.5
     * `Dinero({ amount: 500050 })` | `'0,0.0 dollar'`  | 5,000.5 dollars
     *
     * Don't try to substitute the `$` sign or the `USD` code with your target currency, nor adapt the format string to the exact format you want.
     * The format is a mask which defines a pattern and returns a valid, localized currency string.
     * If you want to display the object in a custom way, either use {@link module:Dinero~getAmount getAmount}, {@link module:Dinero~toUnit toUnit} or {@link module:Dinero~toRoundedUnit toRoundedUnit} and manipulate the output string as you wish.
     *
     * {@link module:Dinero~toFormat toFormat} wraps around `Number.prototype.toLocaleString`. For that reason, **format will vary depending on how it's implemented in the end user's environment**.
     *
     * You can also use `toLocaleString` directly:
     * `Dinero().toRoundedUnit(digits, roundingMode).toLocaleString(locale, options)`.
     *
     * By default, amounts are rounded using the **half away from zero** rule ([commercial rounding](https://en.wikipedia.org/wiki/Rounding#Round_half_away_from_zero)).
     * You can also specify a different `roundingMode` to better fit your needs.
     *
     * @param  {String} [format='$0,0.00'] - The format mask to format to.
     * @param  {String} [roundingMode='HALF_AWAY_FROM_ZERO'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @example
     * // returns $2,000
     * Dinero({ amount: 200000 }).toFormat('$0,0')
     * @example
     * // returns €50.5
     * Dinero({ amount: 5050, currency: 'EUR' }).toFormat('$0,0.0')
     * @example
     * // returns 100 euros
     * Dinero({ amount: 10000, currency: 'EUR' }).setLocale('fr-FR').toFormat('0,0 dollar')
     * @example
     * // returns 2000
     * Dinero({ amount: 200000, currency: 'EUR' }).toFormat()
     * @example
     * // returns $10
     * Dinero({ amount: 1050 }).toFormat('$0', 'HALF_EVEN')
     *
     * @return {String}
     */
    toFormat: function toFormat() {
      var format = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : globalFormat;
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : globalFormatRoundingMode;
      var formatter = Format(format);
      return this.toRoundedUnit(formatter.getMinimumFractionDigits(), roundingMode).toLocaleString(this.getLocale(), {
        currencyDisplay: formatter.getCurrencyDisplay(),
        useGrouping: formatter.getUseGrouping(),
        minimumFractionDigits: formatter.getMinimumFractionDigits(),
        style: formatter.getStyle(),
        currency: this.getCurrency()
      });
    },
    /**
     * Returns the amount represented by this object in units.
     *
     * @example
     * // returns 10.5
     * Dinero({ amount: 1050 }).toUnit()
     * @example
     * // returns 10.545
     * Dinero({ amount: 10545, precision: 3 }).toUnit()
     *
     * @return {Number}
     */
    toUnit: function toUnit() {
      return calculator$1.divide(this.getAmount(), Math.pow(10, precision));
    },
    /**
     * Returns the amount represented by this object in rounded units.
     *
     * By default, the method uses the **half away from zero** rule ([commercial rounding](https://en.wikipedia.org/wiki/Rounding#Round_half_away_from_zero)).
     * You can also specify a different `roundingMode` to better fit your needs.
     *
     * @example
     * // returns 10.6
     * Dinero({ amount: 1055 }).toRoundedUnit(1)
     * @example
     * // returns 10
     * Dinero({ amount: 1050 }).toRoundedUnit(0, 'HALF_EVEN')
     *
     * @param  {Number} digits - The number of fraction digits to round to.
     * @param  {String} [roundingMode='HALF_AWAY_FROM_ZERO'] - The rounding mode to use: `'HALF_ODD'`, `'HALF_EVEN'`, `'HALF_UP'`, `'HALF_DOWN'`, `'HALF_TOWARDS_ZERO'`, `'HALF_AWAY_FROM_ZERO'` or `'DOWN'`.
     *
     * @return {Number}
     */
    toRoundedUnit: function toRoundedUnit(digits) {
      var roundingMode = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : globalFormatRoundingMode;
      var factor = Math.pow(10, digits);
      return calculator$1.divide(calculator$1.round(calculator$1.multiply(this.toUnit(), factor), roundingMode), factor);
    },
    /**
     * Returns the object's data as an object literal.
     *
     * @example
     * // returns { amount: 500, currency: 'EUR', precision: 2 }
     * Dinero({ amount: 500, currency: 'EUR', precision: 2 }).toObject()
     *
     * @return {Object}
     */
    toObject: function toObject() {
      return {
        amount,
        currency,
        precision
      };
    },
    /**
     * Returns the object's data as an object literal.
     *
     * Alias of {@link module:Dinero~toObject toObject}.
     * It is defined so that calling `JSON.stringify` on a Dinero object will automatically extract the relevant data.
     *
     * @example
     * // returns '{"amount":500,"currency":"EUR","precision":2}'
     * JSON.stringify(Dinero({ amount: 500, currency: 'EUR', precision: 2 }))
     *
     * @return {Object}
     */
    toJSON: function toJSON() {
      return this.toObject();
    }
  };
};
var dinero = Object.assign(Dinero, Defaults, Globals, Static);
var dinero_default = dinero;

// src/utils/monetary.ts
function parseMonetaryString(value) {
  let cleaned = value.replace(/[$\s]/g, "");
  if (!cleaned || cleaned === "") {
    return null;
  }
  cleaned = cleaned.replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return null;
  }
  const amountInCents = Math.round(parsed * 100);
  return {
    amount: amountInCents,
    currency: "USD"
  };
}
function numberToMonetary(value) {
  return {
    amount: Math.round(value * 100),
    // Convert dollars to cents
    currency: "USD"
  };
}
function toDinero(monetary) {
  try {
    return dinero_default({ amount: monetary.amount, currency: monetary.currency });
  } catch (error) {
    console.error("Error creating Dinero object:", error);
    return {
      equalsTo: (other) => {
        return other && other.amount === monetary.amount && other.currency === monetary.currency;
      },
      toFormat: (format) => {
        const dollars = monetary.amount / 100;
        return format.replace("0,0.00", dollars.toFixed(2));
      }
    };
  }
}
function matchesMonetaryQuery(query, dataValue) {
  const queryMonetary = parseMonetaryString(query);
  if (!queryMonetary) {
    return false;
  }
  const dataMonetary = numberToMonetary(dataValue);
  const queryDinero = toDinero(queryMonetary);
  const dataDinero = toDinero(dataMonetary);
  if (queryDinero.equalsTo(dataDinero)) {
    return true;
  }
  const queryDollars = queryMonetary.amount / 100;
  const dataDollars = dataMonetary.amount / 100;
  const queryStr = queryDollars.toString();
  const dataStr = dataDollars.toString();
  const originalQuery = query.replace(/[$\s]/g, "");
  const hasExplicitDecimal = originalQuery.includes(".");
  if (hasExplicitDecimal) {
    const tolerance = 0.01;
    return Math.abs(queryDollars - dataDollars) <= tolerance;
  }
  const commaZeroMatch = originalQuery.match(/^(\d+),0$/);
  if (commaZeroMatch) {
    const [, integerPart] = commaZeroMatch;
    const alternativeQueryStr = integerPart;
    const alternativeQueryStr2 = `${integerPart}0`;
    if (dataStr === alternativeQueryStr) {
      return true;
    }
    if (dataStr.startsWith(alternativeQueryStr2)) {
      return true;
    }
  }
  const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
  if (commaPatternMatch) {
    const [, integerPart, decimalPart] = commaPatternMatch;
    const prefixPattern = `${integerPart}${decimalPart}`;
    if (dataStr.startsWith(prefixPattern)) {
      return true;
    }
  }
  return matchesPrefixPattern(queryStr, dataStr);
}
function matchesPrefixPattern(queryStr, dataStr) {
  if (dataStr.startsWith(queryStr)) {
    const queryHasDecimal = queryStr.includes(".");
    const dataHasDecimal = dataStr.includes(".");
    if (queryHasDecimal && dataHasDecimal) {
      return true;
    } else if (!queryHasDecimal && !dataHasDecimal) {
      if (dataStr.length > queryStr.length) {
        if (queryStr.length >= 3) {
          return true;
        } else {
          const nextDigit = dataStr[queryStr.length];
          return nextDigit === "0";
        }
      }
      return true;
    } else {
      return false;
    }
  }
  if (queryStr.startsWith(dataStr)) {
    return queryStr.length >= dataStr.length + 4 && dataStr.length >= 2;
  }
  return false;
}
function extractMonetaryAmounts(query) {
  const amounts = [];
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const monetary = parseMonetaryString(token);
    if (monetary) {
      amounts.push(monetary);
    }
  }
  return amounts;
}
function hasMonetaryValue(text) {
  if (text.includes("$") || text.includes(".") || text.includes(",")) {
    return true;
  }
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed);
}

// src/utils/highlight.ts
var highlightCache = /* @__PURE__ */ new Map();
var MAX_CACHE_SIZE = 1e3;
function getCacheKey(text, query, type) {
  return `${type}:${text.length}:${query}:${text.substring(0, 50)}`;
}
function setCache(key, value) {
  if (highlightCache.size >= MAX_CACHE_SIZE) {
    const firstKey = highlightCache.keys().next().value;
    highlightCache.delete(firstKey);
  }
  highlightCache.set(key, value);
}
function getCache(key) {
  return highlightCache.get(key);
}
function clearHighlightCache() {
  highlightCache.clear();
}
function highlightText(text, query) {
  if (!query.trim()) {
    return escapeHtml(text);
  }
  const cacheKey = getCacheKey(text, query, "text");
  const cached = getCache(cacheKey);
  if (cached !== void 0) {
    return cached;
  }
  const tokens = extractSearchTermsFromQuery(query);
  if (tokens.length === 0) {
    const result = escapeHtml(text);
    setCache(cacheKey, result);
    return result;
  }
  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  for (const token of sortedTokens) {
    if (!textLower.includes(token)) {
      continue;
    }
    const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
    highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
  setCache(cacheKey, highlightedText);
  return highlightedText;
}
function extractSearchTermsFromQuery(query) {
  if (isBooleanQuery(query)) {
    return extractTermsFromBooleanQuery(query);
  }
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}
function isBooleanQuery(query) {
  const trimmed = query.trim();
  return /\s+(AND|OR|NOT)\s+/.test(trimmed);
}
function extractTermsFromBooleanQuery(query) {
  const trimmed = query.trim();
  const terms = [];
  const parts = trimmed.split(/\s+(AND|OR|NOT)\s+/);
  for (const part of parts) {
    if (part === "AND" || part === "OR" || part === "NOT") {
      continue;
    }
    const partTerms = part.toLowerCase().split(/\s+/).filter(Boolean);
    terms.push(...partTerms);
  }
  return terms;
}
function highlightHybridBoolean(text, query, tokens) {
  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();
  const highlightedPositions = /* @__PURE__ */ new Set();
  const isPositionHighlighted = (start, end) => {
    for (let i = start; i < end; i++) {
      if (highlightedPositions.has(i)) {
        return true;
      }
    }
    return false;
  };
  const markPositionsHighlighted = (start, end) => {
    for (let i = start; i < end; i++) {
      highlightedPositions.add(i);
    }
  };
  const applyHighlighting = (pattern, className) => {
    let match;
    const matches = [];
    while ((match = pattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isPositionHighlighted(start, end)) {
        matches.push({ match: match[0], start, end });
      }
    }
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = matches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="${className}">${matchText}</mark>`;
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  };
  for (const token of tokens) {
    if (token.startsWith("$")) {
      const amountPart = token.slice(1).trim();
      const monetaryQuery = `$${amountPart}`;
      const { amounts, textTokens, range } = extractMonetaryTokens(monetaryQuery);
      if (amounts.length > 0 || textTokens.length > 0 || range) {
        const originalQuery = monetaryQuery.replace(/[$\s]/g, "");
        const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
        if (commaPatternMatch) {
          const [, integerPart, decimalPart] = commaPatternMatch;
          const prefixPattern = `${integerPart}${decimalPart}`;
          const prefixPatternRegex = new RegExp(
            `(\\$\\b${escapeRegex(prefixPattern)}\\d*\\b|\\$\\b${escapeRegex(prefixPattern.slice(0, -2))},${escapeRegex(prefixPattern.slice(-2))}\\d*\\b)`,
            "g"
          );
          applyHighlighting(prefixPatternRegex, "monetary-highlight-partial");
          continue;
        }
        for (const amount of amounts) {
          const amountStr = amount.toString();
          const amountWithCommas = amount.toLocaleString();
          const monetaryPattern = new RegExp(
            `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
            "g"
          );
          applyHighlighting(monetaryPattern, "monetary-highlight-exact");
        }
        continue;
      }
    }
    if (hasMonetaryValue(token)) {
      const monetaryQuery = `$${token}`;
      const { amounts, textTokens, range } = extractMonetaryTokens(monetaryQuery);
      if (amounts.length > 0 || textTokens.length > 0 || range) {
        for (const amount of amounts) {
          const amountStr = amount.toString();
          const amountWithCommas = amount.toLocaleString();
          const pattern = new RegExp(
            `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
            "g"
          );
          applyHighlighting(pattern, "monetary-highlight-exact");
        }
        continue;
      }
    }
    if (textLower.includes(token)) {
      const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
      applyHighlighting(regex, "search-highlight");
    }
  }
  return highlightedText;
}
function findBestMatch(record, query) {
  if (!query.trim()) {
    return null;
  }
  const tokens = extractSearchTermsFromQuery(query);
  if (tokens.length === 0) {
    return null;
  }
  const searchableFields = [
    { field: "title", content: record.title },
    { field: "summary", content: record.summary },
    { field: "project", content: record.project },
    { field: "client", content: record.client },
    { field: "status", content: record.status },
    { field: "tags", content: record.tags.join(" ") }
  ];
  if (record.entityType === "Document") {
    const docRecord = record;
    if (docRecord.documentType) {
      searchableFields.push({ field: "documentType", content: docRecord.documentType });
    }
    if (docRecord.author) {
      searchableFields.push({ field: "author", content: docRecord.author });
    }
  }
  if (isPersonRecord(record)) {
    searchableFields.push(
      { field: "personType", content: record.personType },
      { field: "jobTitle", content: record.jobTitle },
      { field: "organization", content: record.associatedOrganization ?? "" },
      { field: "email", content: record.email },
      { field: "phone", content: record.phone },
      { field: "location", content: record.location },
      { field: "tradeFocus", content: record.tradeFocus ?? "" }
    );
  } else if (isOrganizationRecord(record)) {
    searchableFields.push(
      { field: "organizationType", content: record.organizationType },
      { field: "tradeFocus", content: record.tradeFocus },
      { field: "serviceArea", content: record.serviceArea },
      { field: "primaryContact", content: record.primaryContact },
      { field: "phone", content: record.phone },
      { field: "email", content: record.email },
      { field: "website", content: record.website ?? "" }
    );
  } else if (isFinancialRecord(record)) {
    if (record.lineItems) {
      record.lineItems.forEach((item, index) => {
        searchableFields.push(
          { field: `lineItem${index}_title`, content: item.lineItemTitle },
          { field: `lineItem${index}_description`, content: item.lineItemDescription },
          { field: `lineItem${index}_type`, content: item.lineItemType }
        );
      });
    }
  }
  Object.entries(record.metadata || {}).forEach(([key, value]) => {
    if (value != null) {
      searchableFields.push({ field: `metadata_${key}`, content: String(value) });
    }
  });
  let bestMatch = null;
  let bestScore = 0;
  for (const { field, content } of searchableFields) {
    if (!content) continue;
    const contentLower = content.toLowerCase();
    const matchingTokens = tokens.filter((token) => contentLower.includes(token));
    const score = matchingTokens.length;
    if (score > bestScore) {
      bestMatch = {
        field,
        content,
        highlightedContent: highlightText(content, query)
      };
      bestScore = score;
    }
  }
  return bestMatch;
}
function getContextSnippet(match, maxLength = 100, query) {
  if (!match) return "";
  const content = match.content;
  if (content.length <= maxLength) {
    return match.highlightedContent;
  }
  const tokens = content.toLowerCase().split(/\s+/);
  const queryTokens = query ? query.toLowerCase().split(/\s+/) : [];
  let startIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (queryTokens.some((qt) => tokens[i].includes(qt))) {
      startIndex = Math.max(0, i - 2);
      break;
    }
  }
  const words = content.split(/\s+/);
  const snippet = words.slice(startIndex, startIndex + Math.ceil(maxLength / 8)).join(" ");
  if (snippet.length < content.length) {
    return highlightText(snippet + "...", query || "");
  }
  return match.highlightedContent;
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function extractMonetaryTokens(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const amounts = [];
  const textTokens = [];
  const range = parseRangeQuery(query);
  if (range) {
    return { amounts, textTokens, range };
  }
  for (const token of tokens) {
    const parsed = parseCurrencyString(token);
    if (parsed !== null) {
      amounts.push(parsed);
    } else {
      textTokens.push(token);
    }
  }
  return { amounts, textTokens, range: null };
}
function parseCurrencyString(amountStr) {
  let cleaned = amountStr.replace(/[$\s]/g, "");
  if (!cleaned || cleaned === "") {
    return null;
  }
  if (cleaned.includes("-") || cleaned.toLowerCase().includes(" to ")) {
    return null;
  }
  cleaned = cleaned.replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
function parseRangeQuery(query) {
  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
    // 100-200
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i,
    // 100 to 200
    /\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)/,
    // $100-$200
    /\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/i
    // $100 to $200
  ];
  for (const pattern of rangePatterns) {
    const match = query.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }
  return null;
}
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isPartialMonetaryMatch(queryAmount, dataValue) {
  const queryStr = queryAmount.toString();
  const dataStr = dataValue.toString();
  if (queryStr === dataStr) {
    return true;
  }
  if (dataStr.startsWith(queryStr)) {
    if (dataStr.length > queryStr.length) {
      const nextChar = dataStr[queryStr.length];
      return nextChar === "." || nextChar === "0";
    }
    return true;
  }
  const dataWithoutTrailingZeros = dataStr.replace(/0+$/, "");
  if (dataWithoutTrailingZeros.startsWith(queryStr)) {
    return true;
  }
  if (queryStr.length >= 2 && dataStr.length > queryStr.length) {
    if (dataStr.startsWith(queryStr)) {
      const nextChar = dataStr[queryStr.length];
      if (/^\d$/.test(nextChar)) {
        return true;
      }
    }
  }
  if (queryStr.includes(".")) {
    const queryIntegerPart = queryStr.split(".")[0];
    const dataIntegerPart = dataStr.split(".")[0];
    if (dataIntegerPart.startsWith(queryIntegerPart) && queryIntegerPart.length >= 2) {
      return true;
    }
  }
  return false;
}
function highlightMonetaryValuesWithPartialMatches(text, query) {
  if (!query.trim()) {
    return escapeHtml(text);
  }
  const cacheKey = getCacheKey(text, query, "monetary");
  const cached = getCache(cacheKey);
  if (cached !== void 0) {
    return cached;
  }
  const tokens = extractSearchTermsFromQuery(query);
  if (tokens.length === 0) {
    const result2 = escapeHtml(text);
    setCache(cacheKey, result2);
    return result2;
  }
  if (isBooleanQuery(query)) {
    const result2 = highlightHybridBoolean(text, query, tokens);
    setCache(cacheKey, result2);
    return result2;
  }
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    const result2 = escapeHtml(text);
    setCache(cacheKey, result2);
    return result2;
  }
  const result = highlightWithPositionTracking(text, query, amounts, textTokens, range);
  setCache(cacheKey, result);
  return result;
}
function highlightWithPositionTracking(text, query, amounts, textTokens, range) {
  const isExplicitMonetary = query.trim().startsWith("$");
  let highlightedText = escapeHtml(text);
  const highlightedPositions = /* @__PURE__ */ new Set();
  const isPositionHighlighted = (start, end) => {
    for (let i = start; i < end; i++) {
      if (highlightedPositions.has(i)) {
        return true;
      }
    }
    return false;
  };
  const markPositionsHighlighted = (start, end) => {
    for (let i = start; i < end; i++) {
      highlightedPositions.add(i);
    }
  };
  const applyHighlighting = (pattern, className) => {
    let match;
    const matches = [];
    while ((match = pattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isPositionHighlighted(start, end)) {
        matches.push({ match: match[0], start, end });
      }
    }
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = matches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="${className}">${matchText}</mark>`;
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  };
  const originalQuery = query.replace(/[$\s]/g, "");
  const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
  if (commaPatternMatch) {
    const [, integerPart, decimalPart] = commaPatternMatch;
    const prefixPattern = `${integerPart}${decimalPart}`;
    const prefixPatternRegex = new RegExp(
      `(\\$\\b${escapeRegex(prefixPattern)}\\d*\\b|\\$\\b${escapeRegex(prefixPattern.slice(0, -2))},${escapeRegex(prefixPattern.slice(-2))}\\d*\\b)`,
      "g"
    );
    applyHighlighting(prefixPatternRegex, "monetary-highlight-partial");
  }
  if (!commaPatternMatch) {
    for (const amount of amounts) {
      const amountStr = amount.toString();
      const amountWithCommas = amount.toLocaleString();
      if (isExplicitMonetary) {
        const monetaryPattern = new RegExp(
          `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
          "g"
        );
        applyHighlighting(monetaryPattern, "monetary-highlight-exact");
      } else {
        const pattern = new RegExp(
          `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
          "g"
        );
        applyHighlighting(pattern, "monetary-highlight-exact");
      }
    }
  }
  const hasExactMatches = highlightedText.includes("monetary-highlight-exact");
  const hasPartialMatches = highlightedText.includes("monetary-highlight-partial");
  const shouldDoPartialMatching = !isExplicitMonetary || !hasExactMatches && !hasPartialMatches;
  if (shouldDoPartialMatching) {
    const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
    let match;
    const partialMatches = [];
    while ((match = monetaryValuePattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isPositionHighlighted(start, end)) {
        const numericValue = parseFloat(match[0].replace(/[$,\s]/g, ""));
        for (const queryAmount of amounts) {
          if (isPartialMonetaryMatch(queryAmount, numericValue)) {
            partialMatches.push({ match: match[0], start, end, numericValue });
            break;
          }
        }
      }
    }
    for (let i = partialMatches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = partialMatches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="monetary-highlight-partial">${matchText}</mark>`;
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  }
  if (range) {
    const rangePatterns = [
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s*-\\s*${escapeRegex(range.max.toString())}\\b`, "g"),
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s+to\\s+${escapeRegex(range.max.toString())}\\b`, "gi"),
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\b`, "g"),
      new RegExp(`\\b${escapeRegex(range.max.toString())}\\b`, "g")
    ];
    for (const pattern of rangePatterns) {
      applyHighlighting(pattern, "monetary-highlight-range");
    }
    const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
    let match;
    const rangeMatches = [];
    while ((match = monetaryValuePattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (!isPositionHighlighted(start, end)) {
        const numericValue = parseFloat(match[0].replace(/[$,\s]/g, ""));
        if (!isNaN(numericValue) && numericValue >= range.min && numericValue <= range.max) {
          rangeMatches.push({ match: match[0], start, end });
        }
      }
    }
    for (let i = rangeMatches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = rangeMatches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="monetary-highlight-range">${matchText}</mark>`;
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  }
  for (const token of textTokens) {
    const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
    applyHighlighting(regex, "monetary-highlight-text");
  }
  return highlightedText;
}

// src/utils/query.ts
var MIN_EFFECTIVE_QUERY_LENGTH = 2;
function getEffectiveQueryLength(query) {
  if (!query) {
    return 0;
  }
  return query.replace(/\$/g, "").replace(/\s+/g, "").length;
}
function isQueryTooShort(query) {
  const effectiveLength = getEffectiveQueryLength(query);
  return effectiveLength > 0 && effectiveLength < MIN_EFFECTIVE_QUERY_LENGTH;
}

// src/utils/time.ts
function timeAgo(timestamp, options = {}) {
  const { includeSeconds = false, compact = false } = options;
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 0) {
    return "just now";
  }
  if (diff < 60 * 1e3) {
    if (includeSeconds) {
      const seconds = Math.floor(diff / 1e3);
      return compact ? `${seconds}s` : seconds <= 1 ? "just now" : `${seconds} seconds ago`;
    }
    return "just now";
  }
  if (diff < 60 * 60 * 1e3) {
    const minutes = Math.floor(diff / (60 * 1e3));
    return compact ? `${minutes}m` : minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  if (diff < 24 * 60 * 60 * 1e3) {
    const hours = Math.floor(diff / (60 * 60 * 1e3));
    return compact ? `${hours}h` : hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (diff < 7 * 24 * 60 * 60 * 1e3) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1e3));
    return compact ? `${days}d` : days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (diff < 30 * 24 * 60 * 60 * 1e3) {
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1e3));
    return compact ? `${weeks}w` : weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (diff < 365 * 24 * 60 * 60 * 1e3) {
    const months = Math.floor(diff / (30 * 24 * 60 * 60 * 1e3));
    return compact ? `${months}mo` : months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(diff / (365 * 24 * 60 * 60 * 1e3));
  return compact ? `${years}y` : years === 1 ? "1 year ago" : `${years} years ago`;
}

// src/data/recentSearches.ts
var STORAGE_KEY = "search-prototype-recent-searches";
var MAX_STORED_SEARCHES = 100;
var MIN_QUERY_LENGTH = 2;
var DEBOUNCE_MS = 1e3;
var RecentSearchesManager = class {
  constructor() {
    this.searches = [];
    this.lastRecordedTime = 0;
    this.lastRecordedQuery = "";
    this.loadFromStorage();
  }
  /**
   * Add a new search to recent searches
   * Only records "complete" queries, not partial keystrokes
   */
  addSearch(query, resultCount) {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return;
    }
    const now = Date.now();
    if (trimmed === this.lastRecordedQuery && now - this.lastRecordedTime < DEBOUNCE_MS) {
      return;
    }
    const search = {
      id: this.generateId(),
      query: trimmed,
      timestamp: now,
      resultCount
    };
    this.searches = this.searches.filter((s) => s.query !== trimmed);
    this.searches.unshift(search);
    if (this.searches.length > MAX_STORED_SEARCHES) {
      this.searches = this.searches.slice(0, MAX_STORED_SEARCHES);
    }
    this.lastRecordedTime = now;
    this.lastRecordedQuery = trimmed;
    this.saveToStorage();
  }
  /**
   * Get recent searches, optionally limited to a specific count
   */
  getRecentSearches(limit) {
    return limit ? this.searches.slice(0, limit) : [...this.searches];
  }
  /**
   * Clear all recent searches
   */
  clearAll() {
    this.searches = [];
    this.lastRecordedTime = 0;
    this.lastRecordedQuery = "";
    this.saveToStorage();
  }
  /**
   * Remove a specific search by ID
   */
  removeSearch(id) {
    this.searches = this.searches.filter((s) => s.id !== id);
    this.saveToStorage();
  }
  /**
   * Get searches formatted for display with time ago strings and result count metadata
   */
  getFormattedRecentSearches(limit) {
    return this.getRecentSearches(limit).map((search) => ({
      ...search,
      timeAgo: timeAgo(search.timestamp),
      resultCountText: this.formatResultCount(search.resultCount)
    }));
  }
  /**
   * Format result count with proper pluralization
   */
  formatResultCount(count) {
    if (count === void 0 || count === null) {
      return "";
    }
    if (count === 0) {
      return "No results";
    } else if (count === 1) {
      return "1 result";
    } else {
      return `${count.toLocaleString()} results`;
    }
  }
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.searches = parsed.filter(
            (item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.query === "string" && typeof item.timestamp === "number"
          );
        }
      }
    } catch (error) {
      console.warn("Failed to load recent searches from storage:", error);
      this.searches = [];
    }
  }
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.searches));
    } catch (error) {
      console.warn("Failed to save recent searches to storage:", error);
    }
  }
  generateId() {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
var recentSearches = new RecentSearchesManager();

// src/config/defaults.json
var defaults_default = {
  searchDelayMs: 100,
  searchDelayVarianceMs: 10,
  groupLimits: {
    Document: 4,
    ClientInvoice: 4,
    PurchaseOrder: 4,
    Bill: 4,
    Receipt: 4,
    Payment: 4,
    Person: 4,
    Organization: 4
  },
  lineItemBehavior: "show-matched-with-context-3",
  collapseIrrelevantLineItems: true,
  lineItemsCollapseThreshold: 5,
  maxFacetValues: 5,
  recentSearchesDisplayLimit: 5,
  showInferredRelationships: true
};

// src/state/store.ts
function createStore(initialState3) {
  let state = initialState3;
  const listeners = /* @__PURE__ */ new Set();
  const getState = () => state;
  const setState = (updater) => {
    const nextState = typeof updater === "function" ? updater(state) : { ...state, ...updater };
    if (Object.is(nextState, state)) {
      return;
    }
    state = nextState;
    listeners.forEach((listener) => listener(state));
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return { getState, setState, subscribe };
}

// src/state/settingsStore.ts
var STORAGE_KEY2 = "search-prototype.settings";
var DEFAULTS = normalize(defaults_default);
function normalize(state) {
  return {
    ...state,
    groupLimits: { ...state.groupLimits },
    searchDelayVarianceMs: state.searchDelayVarianceMs ?? 10,
    lineItemBehavior: state.lineItemBehavior ?? "show-matched-with-context-3",
    collapseIrrelevantLineItems: state.collapseIrrelevantLineItems ?? true,
    lineItemsCollapseThreshold: state.lineItemsCollapseThreshold ?? 5,
    maxFacetValues: state.maxFacetValues ?? 5,
    recentSearchesDisplayLimit: state.recentSearchesDisplayLimit ?? 5,
    showInferredRelationships: state.showInferredRelationships ?? true
  };
}
function mergeSettings(base, overrides) {
  if (!overrides) {
    return normalize(base);
  }
  return {
    ...base,
    ...overrides,
    groupLimits: {
      ...base.groupLimits,
      ...overrides.groupLimits ?? {}
    }
  };
}
function readPersisted() {
  if (typeof window === "undefined") {
    return void 0;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY2);
    if (!raw) {
      return void 0;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse persisted settings; falling back to defaults.", error);
    return void 0;
  }
}
function persist(state) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY2, JSON.stringify(state));
}
var initialState = mergeSettings(DEFAULTS, readPersisted());
var store = createStore(initialState);
store.subscribe((state) => {
  persist(state);
});
var settingsStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  update(partial) {
    store.setState((prev) => mergeSettings(prev, partial));
  },
  setGroupLimit(section, limit) {
    store.setState(
      (prev) => mergeSettings(prev, {
        groupLimits: {
          ...prev.groupLimits,
          [section]: limit
        }
      })
    );
  },
  reset() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY2);
    }
    store.setState(() => normalize(DEFAULTS));
  },
  get defaults() {
    return normalize(DEFAULTS);
  }
};

// src/components/searchDialog.ts
function isMacOS() {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}
function getModifierKey() {
  return isMacOS() ? "\u2318" : "Ctrl";
}
function getHighlightFunction(query, isMonetarySearch) {
  if (isMonetarySearch) {
    return highlightMonetaryValuesWithPartialMatches;
  } else {
    return highlightText;
  }
}
function createSearchDialog(host, options) {
  const dialog = document.createElement("div");
  dialog.className = "search-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "false");
  dialog.setAttribute("aria-label", "Search results");
  dialog.setAttribute("aria-describedby", "search-dialog-instructions");
  dialog.hidden = true;
  const instructions = document.createElement("div");
  instructions.id = "search-dialog-instructions";
  instructions.className = "sr-only";
  instructions.textContent = "Use arrow keys to navigate results, Enter to select, Escape to close, Ctrl+Enter to see all results";
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "sr-only";
  liveRegion.id = "search-dialog-announcements";
  host.append(instructions, liveRegion, dialog);
  let previousState2 = null;
  function announce(message) {
    liveRegion.textContent = message;
    setTimeout(() => {
      liveRegion.textContent = "";
    }, 1e3);
  }
  function handleKeyDown(event) {
    if (!previousState2?.visible) {
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      options.onSeeAllResults();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
      if (!previousState2.response || previousState2.query === "") {
        const recentItems = dialog.querySelectorAll(".search-dialog__recent-item");
        const currentIndex = previousState2.selectedIndex ?? -1;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          const newIndex = Math.min(currentIndex + 1, recentItems.length - 1);
          setState({ ...previousState2, selectedIndex: newIndex });
          scrollRecentIntoView(newIndex);
          if (newIndex >= 0) {
            const item = recentItems[newIndex];
            const query = item.getAttribute("data-query") || "recent search";
            announce(`Selected recent search: ${query}`);
          }
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          const newIndex = Math.max(currentIndex - 1, -1);
          setState({ ...previousState2, selectedIndex: newIndex });
          scrollRecentIntoView(newIndex);
          if (newIndex >= 0) {
            const item = recentItems[newIndex];
            const query = item.getAttribute("data-query") || "recent search";
            announce(`Selected recent search: ${query}`);
          } else {
            announce("No recent search selected");
          }
        } else if (event.key === "Enter" && currentIndex >= 0) {
          event.preventDefault();
          event.stopPropagation();
          const selectedItem = recentItems[currentIndex];
          if (selectedItem) {
            const query = selectedItem.getAttribute("data-query") || "recent search";
            announce(`Searching for: ${query}`);
            selectedItem.click();
          }
        }
        return;
      }
      if (!previousState2.response) {
        return;
      }
      const allItems = getAllSearchItems(previousState2.response);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        const currentIndex = previousState2.selectedIndex ?? -1;
        const newIndex = Math.min(currentIndex + 1, allItems.length - 1);
        setState({ ...previousState2, selectedIndex: newIndex });
        scrollSelectedIntoView(newIndex);
        if (newIndex >= 0) {
          const selectedItem = allItems[newIndex];
          announce(`Selected result ${newIndex + 1} of ${allItems.length}: ${selectedItem.title}`);
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const currentIndex = previousState2.selectedIndex ?? -1;
        const newIndex = Math.max(currentIndex - 1, -1);
        setState({ ...previousState2, selectedIndex: newIndex });
        scrollSelectedIntoView(newIndex);
        if (newIndex >= 0) {
          const selectedItem = allItems[newIndex];
          announce(`Selected result ${newIndex + 1} of ${allItems.length}: ${selectedItem.title}`);
        } else {
          announce("No result selected");
        }
      } else if (event.key === "Enter" && (previousState2.selectedIndex ?? -1) >= 0) {
        event.preventDefault();
        event.stopPropagation();
        const selectedItem = allItems[previousState2.selectedIndex || -1];
        if (selectedItem && isBuildertrendRecord(selectedItem)) {
          announce(`Navigating to: ${selectedItem.title}`);
        }
      }
    }
  }
  function scrollSelectedIntoView(selectedIndex) {
    if (selectedIndex < 0) {
      return;
    }
    requestAnimationFrame(() => {
      const selectedElement = dialog.querySelector(`[data-item-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }
    });
  }
  function scrollRecentIntoView(selectedIndex) {
    if (selectedIndex < 0) {
      return;
    }
    requestAnimationFrame(() => {
      const recentItems = dialog.querySelectorAll(".search-dialog__recent-item");
      const selectedElement = recentItems[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      }
    });
  }
  dialog.addEventListener("keydown", handleKeyDown, true);
  dialog.setAttribute("tabindex", "-1");
  document.addEventListener("keydown", (event) => {
    if (!previousState2?.visible) {
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      return;
    }
    const target = event.target;
    const isInputField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.closest && target.closest(".search-dialog__recent-item"));
    if (isInputField && previousState2?.response) {
      return;
    }
    handleKeyDown(event);
  });
  const searchInput = document.querySelector('input[type="search"]');
  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (!["Enter", "ArrowDown", "ArrowUp"].includes(event.key)) {
        return;
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        options.onSeeAllResults();
        return;
      }
      if (previousState2?.visible && previousState2?.response && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        event.stopPropagation();
        searchInput.blur();
        handleKeyDown(event);
      }
    });
  }
  window.addEventListener("refresh-dialog", () => {
    if (previousState2?.visible) {
      requestAnimationFrame(() => {
        renderDialogContents(dialog, previousState2, options);
      });
    }
  });
  const setState = (state) => {
    const visibilityChanged = !previousState2 || previousState2.visible !== state.visible;
    if (visibilityChanged) {
      requestAnimationFrame(() => {
        dialog.hidden = !state.visible;
        if (dialog.hidden) {
          dialog.innerHTML = "";
          dialog.style.display = "none";
        } else {
          dialog.style.display = "flex";
        }
      });
      if (state.visible) {
        announce("Search dialog opened");
      }
      if (!state.visible) {
        previousState2 = state;
        return;
      }
    }
    if (!previousState2 || previousState2.isMonetarySearch !== state.isMonetarySearch) {
      requestAnimationFrame(() => {
        dialog.classList.toggle("monetary-search", state.isMonetarySearch || false);
      });
    }
    const selectedIndexChanged = !previousState2 || previousState2.selectedIndex !== state.selectedIndex;
    const contentChanged = visibilityChanged || !previousState2 || previousState2.status !== state.status || previousState2.query !== state.query || previousState2.response !== state.response || selectedIndexChanged;
    if (contentChanged) {
      const channel = new MessageChannel();
      channel.port2.onmessage = () => {
        renderDialogContents(dialog, state, options);
        if (state.status === "loading") {
          announce("Searching...");
        } else if (state.status === "error") {
          announce("Search failed. Please try again.");
        } else if (state.status === "ready" && state.response) {
          const resultCount = state.response.totalResults;
          const resultText = resultCount === 1 ? "result" : "results";
          announce(`Found ${resultCount} ${resultText} for "${state.query}"`);
        } else if (state.status === "ready" && !state.response) {
          announce(`No results found for "${state.query}"`);
        }
      };
      channel.port1.postMessage(null);
    }
    previousState2 = state;
  };
  return {
    element: dialog,
    setState
  };
}
function getAllSearchItems(response) {
  const allItems = [];
  response.limitedGroups.forEach((group) => {
    allItems.push(...group.items);
  });
  return allItems;
}
function renderDialogContents(container, state, options) {
  console.log("\u{1F3A8} renderDialogContents called:", {
    status: state.status,
    query: state.query,
    selectedIndex: state.selectedIndex,
    hasResponse: !!state.response
  });
  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  if (state.status === "loading") {
    fragment.appendChild(renderLoadingState(state.query));
    container.appendChild(fragment);
    return;
  }
  if (state.status === "error") {
    fragment.appendChild(renderErrorState());
    container.appendChild(fragment);
    return;
  }
  const effectiveLength = getEffectiveQueryLength(state.query);
  if (effectiveLength === 0) {
    console.log("\u{1F3A8} Rendering recent searches with selectedIndex:", state.selectedIndex);
    fragment.appendChild(renderRecentSearchesState(state.selectedIndex));
    const footer2 = document.createElement("div");
    footer2.className = "search-dialog__footer";
    const shortcutsContainer2 = document.createElement("div");
    shortcutsContainer2.className = "search-dialog__shortcuts";
    const escShortcut2 = document.createElement("div");
    escShortcut2.className = "search-dialog__shortcut";
    const escKey2 = document.createElement("kbd");
    escKey2.className = "search-dialog__shortcut-key";
    escKey2.textContent = "esc";
    const escText2 = document.createElement("span");
    escText2.className = "search-dialog__shortcut-text";
    escText2.textContent = "to close";
    escShortcut2.append(escKey2, escText2);
    const enterShortcut2 = document.createElement("div");
    enterShortcut2.className = "search-dialog__shortcut";
    const enterKey2 = document.createElement("kbd");
    enterKey2.className = "search-dialog__shortcut-key";
    enterKey2.innerHTML = "\u21B5";
    const enterText2 = document.createElement("span");
    enterText2.className = "search-dialog__shortcut-text";
    enterText2.textContent = "to select";
    enterShortcut2.append(enterKey2, enterText2);
    const arrowsShortcut2 = document.createElement("div");
    arrowsShortcut2.className = "search-dialog__shortcut";
    const arrowsContainer2 = document.createElement("div");
    arrowsContainer2.className = "search-dialog__shortcut-arrows";
    const upArrow2 = document.createElement("kbd");
    upArrow2.className = "search-dialog__shortcut-key";
    upArrow2.innerHTML = "\u2191";
    const downArrow2 = document.createElement("kbd");
    downArrow2.className = "search-dialog__shortcut-key";
    downArrow2.innerHTML = "\u2193";
    arrowsContainer2.append(upArrow2, downArrow2);
    const arrowsText2 = document.createElement("span");
    arrowsText2.className = "search-dialog__shortcut-text";
    arrowsText2.textContent = "to navigate";
    arrowsShortcut2.append(arrowsContainer2, arrowsText2);
    shortcutsContainer2.append(escShortcut2, enterShortcut2, arrowsShortcut2);
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "clear-recent-button";
    clearButton.textContent = "Clear recent searches";
    clearButton.addEventListener("click", () => {
      recentSearches.clearAll();
      const event = new CustomEvent("refresh-dialog");
      window.dispatchEvent(event);
    });
    footer2.append(shortcutsContainer2, clearButton);
    fragment.appendChild(footer2);
    container.appendChild(fragment);
    return;
  }
  if (isQueryTooShort(state.query)) {
    fragment.appendChild(renderShortQueryState());
    container.appendChild(fragment);
    return;
  }
  const response = state.response;
  if (!response || response.totalResults === 0) {
    fragment.appendChild(renderNoResults(state.query));
    container.appendChild(fragment);
    return;
  }
  const allItems = getAllSearchItems(response);
  let itemIndex = 0;
  response.limitedGroups.forEach((group) => {
    fragment.appendChild(renderGroup(group, state.query, state.isMonetarySearch, state.selectedIndex, itemIndex));
    itemIndex += group.items.length;
  });
  const footer = document.createElement("div");
  footer.className = "search-dialog__footer";
  const shortcutsContainer = document.createElement("div");
  shortcutsContainer.className = "search-dialog__shortcuts";
  const escShortcut = document.createElement("div");
  escShortcut.className = "search-dialog__shortcut";
  const escKey = document.createElement("kbd");
  escKey.className = "search-dialog__shortcut-key";
  escKey.textContent = "esc";
  const escText = document.createElement("span");
  escText.className = "search-dialog__shortcut-text";
  escText.textContent = "to close";
  escShortcut.append(escKey, escText);
  const enterShortcut = document.createElement("div");
  enterShortcut.className = "search-dialog__shortcut";
  const enterKey = document.createElement("kbd");
  enterKey.className = "search-dialog__shortcut-key";
  enterKey.innerHTML = "\u21B5";
  const enterText = document.createElement("span");
  enterText.className = "search-dialog__shortcut-text";
  enterText.textContent = "to select";
  enterShortcut.append(enterKey, enterText);
  const arrowsShortcut = document.createElement("div");
  arrowsShortcut.className = "search-dialog__shortcut";
  const arrowsContainer = document.createElement("div");
  arrowsContainer.className = "search-dialog__shortcut-arrows";
  const upArrow = document.createElement("kbd");
  upArrow.className = "search-dialog__shortcut-key";
  upArrow.innerHTML = "\u2191";
  const downArrow = document.createElement("kbd");
  downArrow.className = "search-dialog__shortcut-key";
  downArrow.innerHTML = "\u2193";
  arrowsContainer.append(upArrow, downArrow);
  const arrowsText = document.createElement("span");
  arrowsText.className = "search-dialog__shortcut-text";
  arrowsText.textContent = "to navigate";
  arrowsShortcut.append(arrowsContainer, arrowsText);
  const seeAllShortcut = document.createElement("div");
  seeAllShortcut.className = "search-dialog__shortcut";
  const modifierKey = getModifierKey();
  const seeAllKeyContainer = document.createElement("div");
  seeAllKeyContainer.className = "search-dialog__shortcut-keys";
  const modifierKeyElement = document.createElement("kbd");
  modifierKeyElement.className = "search-dialog__shortcut-key";
  modifierKeyElement.textContent = modifierKey;
  const enterKeyElement = document.createElement("kbd");
  enterKeyElement.className = "search-dialog__shortcut-key";
  enterKeyElement.innerHTML = "\u21B5";
  seeAllKeyContainer.append(modifierKeyElement, enterKeyElement);
  const seeAllText = document.createElement("span");
  seeAllText.className = "search-dialog__shortcut-text";
  seeAllText.textContent = "to see all";
  seeAllShortcut.append(seeAllKeyContainer, seeAllText);
  shortcutsContainer.append(escShortcut, enterShortcut, arrowsShortcut, seeAllShortcut);
  const seeAllButton = document.createElement("button");
  seeAllButton.type = "button";
  seeAllButton.className = "see-all-button";
  seeAllButton.textContent = `See ${response.totalResults} result${response.totalResults === 1 ? "" : "s"} \u2192`;
  seeAllButton.addEventListener("click", () => options.onSeeAllResults());
  footer.append(shortcutsContainer, seeAllButton);
  fragment.appendChild(footer);
  container.appendChild(fragment);
}
function renderRecentSearchesState(selectedIndex) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__recent";
  const settings = settingsStore.getState();
  const recentSearchesList = recentSearches.getFormattedRecentSearches(settings.recentSearchesDisplayLimit);
  if (recentSearchesList.length === 0) {
    wrapper.innerHTML = `
      <h3>Quick search</h3>
      <p>Start typing or press <kbd>/</kbd> to jump into the search bar.</p>
    `;
    return wrapper;
  }
  const header2 = document.createElement("div");
  header2.className = "search-dialog__recent-header";
  header2.innerHTML = `
    <h4>RECENT SEARCHES</h4>
  `;
  wrapper.append(header2);
  const list = document.createElement("ul");
  list.className = "search-dialog__recent-list";
  recentSearchesList.forEach((search, index) => {
    const item = document.createElement("li");
    item.className = "search-dialog__recent-item";
    item.setAttribute("data-query", search.query);
    if (selectedIndex === index) {
      item.classList.add("search-dialog__recent-item--selected");
      item.setAttribute("aria-selected", "true");
    } else {
      item.setAttribute("aria-selected", "false");
    }
    const contentContainer = document.createElement("div");
    contentContainer.className = "search-dialog__recent-content";
    const queryText = document.createElement("div");
    queryText.className = "search-dialog__recent-query";
    queryText.textContent = search.query;
    const metaText = document.createElement("div");
    metaText.className = "search-dialog__recent-meta";
    if (search.resultCountText) {
      const resultText = document.createElement("span");
      resultText.className = "search-dialog__recent-results";
      resultText.textContent = search.resultCountText;
      metaText.append(resultText);
    }
    const timeText = document.createElement("span");
    timeText.className = "search-dialog__recent-time";
    timeText.textContent = search.timeAgo;
    metaText.append(timeText);
    contentContainer.append(queryText, metaText);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "search-dialog__recent-delete";
    deleteButton.setAttribute("aria-label", `Delete recent search: ${search.query}`);
    deleteButton.setAttribute("title", `Remove "${search.query}" from recent searches`);
    deleteButton.innerHTML = "\xD7";
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      recentSearches.removeSearch(search.id);
      const event = new CustomEvent("refresh-dialog");
      window.dispatchEvent(event);
    });
    item.append(contentContainer, deleteButton);
    item.addEventListener("click", () => {
      const event = new CustomEvent("search-query", {
        detail: { query: search.query }
      });
      window.dispatchEvent(event);
    });
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Search for "${search.query}" - ${search.resultCountText || "No results"} - ${search.timeAgo}`);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const event = new CustomEvent("search-query", {
          detail: { query: search.query }
        });
        window.dispatchEvent(event);
      }
    });
    list.append(item);
  });
  wrapper.append(list);
  return wrapper;
}
function renderShortQueryState() {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__empty";
  wrapper.innerHTML = `
    <h3>Keep typing</h3>
    <p>Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.</p>
  `;
  return wrapper;
}
function renderLoadingState(query) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__loading";
  wrapper.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <div>
      <p>Searching for \u201C${escapeHtml2(query)}\u201D\u2026</p>
    </div>
  `;
  return wrapper;
}
function renderErrorState() {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__error";
  wrapper.innerHTML = `
    <h3>We hit a snag</h3>
    <p>Try again in a few seconds.</p>
  `;
  return wrapper;
}
function renderNoResults(query) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__empty";
  wrapper.innerHTML = `
    <h3>No matches</h3>
    <p>We couldn\u2019t find results for \u201C${escapeHtml2(query)}\u201D. Adjust your keywords or filters.</p>
  `;
  return wrapper;
}
function renderGroup(group, query, isMonetarySearch, selectedIndex, startIndex = 0) {
  const section = document.createElement("section");
  section.className = "search-dialog__group";
  const heading = document.createElement("h4");
  heading.textContent = formatEntityType(group.entityType, { plural: true });
  section.append(heading);
  const list = document.createElement("ul");
  list.className = "search-dialog__list";
  group.items.forEach((item, index) => {
    const globalIndex = startIndex + index;
    const isSelected = selectedIndex === globalIndex;
    list.append(renderGroupItem(item, query, isMonetarySearch, isSelected, globalIndex));
  });
  section.append(list);
  return section;
}
function renderGroupItem(item, query, isMonetarySearch, isSelected, itemIndex) {
  const li = document.createElement("li");
  li.setAttribute("data-document-id", item.id);
  if (itemIndex !== void 0) {
    li.setAttribute("data-item-index", itemIndex.toString());
  }
  if (isBuildertrendRecord(item)) {
    li.className = "search-dialog__item search-dialog__item--buildertrend";
    li.setAttribute("data-url", item.url);
    li.setAttribute("tabindex", "0");
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", `Navigate to ${item.title} - ${item.path || item.description || "Buildertrend record"}`);
    li.addEventListener("click", () => {
      console.log("Navigate to:", item.url);
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        console.log("Navigate to:", item.url);
      }
    });
  } else {
    li.className = "search-dialog__item";
    li.setAttribute("role", "listitem");
  }
  li.setAttribute("aria-selected", String(isSelected));
  if (isSelected) {
    li.classList.add("search-dialog__item--selected");
  }
  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);
  const header2 = document.createElement("div");
  header2.className = "search-dialog__item-header";
  if (isBuildertrendRecord(item)) {
    const icon = document.createElement("i");
    icon.className = "search-dialog__item-icon";
    icon.setAttribute("data-lucide", item.icon);
    header2.append(icon);
    requestAnimationFrame(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  }
  const title = document.createElement("div");
  title.className = "search-dialog__item-title";
  title.innerHTML = highlightFn(item.title, query);
  header2.append(title);
  const meta = document.createElement("div");
  meta.className = "search-dialog__item-meta";
  const metaText = buildItemMeta(item, query, isMonetarySearch);
  meta.innerHTML = highlightFn(metaText, query);
  if (!isBuildertrendRecord(item)) {
    const match = findBestMatch(item, query);
    if (match && match.field !== "title") {
      const context = document.createElement("div");
      context.className = "search-context";
      const highlightedSnippet = isMonetarySearch ? highlightMonetaryValuesWithPartialMatches(match.content, query) : getContextSnippet(match, 80, query);
      context.innerHTML = highlightedSnippet;
      li.append(header2, meta, context);
    } else {
      li.append(header2, meta);
    }
  } else {
    li.append(header2, meta);
  }
  if (query && isFinancialRecord(item)) {
    const lineItemsMatch = renderMiniLineItems(item, query, isMonetarySearch);
    if (lineItemsMatch) {
      li.append(lineItemsMatch);
    }
  }
  return li;
}
function buildItemMeta(item, query, isMonetarySearch) {
  const parts = [];
  if (isBuildertrendRecord(item)) {
    parts.push(item.path);
    parts.push(item.description);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  parts.push(item.project);
  if (item.entityType === "Document") {
    parts.push(item.documentType);
    parts.push(`Updated ${formatDate(item.updatedAt)}`);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  if (isFinancialRecord(item)) {
    parts.push(formatCurrency(item.totalValue));
    if (item.status) {
      parts.push(item.status);
    }
    return parts.filter(Boolean).join(" \u2022 ");
  }
  if (isPersonRecord(item)) {
    parts.push(item.personType);
    parts.push(item.jobTitle);
    if (item.associatedOrganization) {
      parts.push(item.associatedOrganization);
    }
    parts.push(item.location);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  if (isOrganizationRecord(item)) {
    parts.push(item.organizationType);
    parts.push(item.tradeFocus);
    parts.push(item.serviceArea);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  return parts.filter(Boolean).join(" \u2022 ");
}
function renderMiniLineItems(item, query, isMonetarySearch) {
  if (!isFinancialRecord(item)) {
    return null;
  }
  const items = item.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }
  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);
  const matchingItems = items.filter((lineItem) => {
    const searchableFields = [
      { value: lineItem.lineItemTitle, field: "title" },
      { value: lineItem.lineItemDescription, field: "description" },
      { value: lineItem.lineItemType, field: "type" },
      { value: lineItem.lineItemQuantity?.toString(), field: "quantity" },
      { value: lineItem.lineItemQuantityUnitOfMeasure, field: "unit" },
      { value: formatCurrency(lineItem.lineItemUnitPrice), field: "unitPrice" },
      { value: formatCurrency(lineItem.lineItemTotal), field: "total" },
      // Add cost code fields for matching
      { value: lineItem.costCode, field: "costCode" },
      { value: lineItem.costCodeName, field: "costCodeName" },
      { value: lineItem.costCodeCategory, field: "costCodeCategory" },
      { value: lineItem.costCodeCategoryName, field: "costCodeCategoryName" }
    ];
    return searchableFields.some(({ value }) => {
      if (!value) return false;
      const highlighted = highlightFn(value, query);
      return highlighted.includes("<mark");
    });
  });
  if (matchingItems.length === 0) {
    return null;
  }
  const wrapper = document.createElement("small");
  wrapper.className = "mini-line-items";
  const table = document.createElement("table");
  table.className = "mini-line-items__table";
  const displayItems = matchingItems.slice(0, 3);
  displayItems.forEach((line) => {
    const row = document.createElement("tr");
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    row.innerHTML = `
      <td class="mini-line-items__description">${highlightFn(line.lineItemTitle, query)}</td>
      <td class="mini-line-items__type">${highlightFn(line.lineItemType, query)}</td>
      <td class="mini-line-items__quantity">${highlightFn(quantity, query)}</td>
      <td class="mini-line-items__unit-price">${highlightFn(unitPrice, query)}</td>
      <td class="mini-line-items__total">${highlightFn(total, query)}</td>
    `;
    table.append(row);
  });
  if (matchingItems.length > 3) {
    const moreRow = document.createElement("tr");
    moreRow.className = "mini-line-items__more-row";
    const remaining = matchingItems.length - 3;
    moreRow.innerHTML = `
      <td colspan="5" class="mini-line-items__more">+${remaining} more matching line item${remaining === 1 ? "" : "s"}\u2026</td>
    `;
    table.append(moreRow);
  }
  wrapper.append(table);
  return wrapper;
}
function escapeHtml2(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// src/utils/relationshipEngine.ts
var SMART_ACTIONS = {
  "Bill": [
    {
      id: "pay-bill",
      label: "Pay bill",
      description: "Process payment for this bill",
      href: "#",
      icon: "credit-card",
      priority: 1,
      relationshipType: "vendor",
      entityTypes: ["Bill"]
    },
    {
      id: "view-vendor-bills",
      label: "View all bills from vendor",
      description: "See all bills from this vendor",
      href: "#",
      icon: "list",
      priority: 2,
      relationshipType: "vendor",
      entityTypes: ["Bill"]
    },
    {
      id: "contact-vendor",
      label: "Contact vendor",
      description: "Get in touch with the vendor",
      href: "#",
      icon: "mail",
      priority: 3,
      relationshipType: "vendor",
      entityTypes: ["Bill"]
    },
    {
      id: "view-payment-history",
      label: "View payment history",
      description: "See payment history for this vendor",
      href: "#",
      icon: "history",
      priority: 4,
      relationshipType: "vendor",
      entityTypes: ["Bill"]
    },
    {
      id: "view-project-bills",
      label: "View all project bills",
      description: "See all bills for this project",
      href: "#",
      icon: "folder",
      priority: 5,
      relationshipType: "project",
      entityTypes: ["Bill"]
    }
  ],
  "Person": [
    {
      id: "send-message",
      label: "Send message",
      description: "Send a message to this person",
      href: "#",
      icon: "message",
      priority: 1,
      entityTypes: ["Person"]
    },
    {
      id: "view-all-activity",
      label: "View all activity",
      description: "See all activity with this person",
      href: "#",
      icon: "activity",
      priority: 2,
      entityTypes: ["Person"]
    },
    {
      id: "view-organization",
      label: "View organization",
      description: "See organization details",
      href: "#",
      icon: "building",
      priority: 3,
      relationshipType: "associatedOrg",
      entityTypes: ["Person"]
    },
    {
      id: "schedule-meeting",
      label: "Schedule meeting",
      description: "Schedule a meeting with this person",
      href: "#",
      icon: "calendar",
      priority: 4,
      entityTypes: ["Person"]
    },
    {
      id: "view-project-activity",
      label: "View project activity",
      description: "See all activity for this project",
      href: "#",
      icon: "folder",
      priority: 5,
      relationshipType: "project",
      entityTypes: ["Person"]
    }
  ],
  "Organization": [
    {
      id: "view-all-bills",
      label: "View all bills",
      description: "See all bills from this organization",
      href: "#",
      icon: "list",
      priority: 1,
      entityTypes: ["Organization"]
    },
    {
      id: "payment-summary",
      label: "Payment summary",
      description: "View payment summary for this vendor",
      href: "#",
      icon: "dollar-sign",
      priority: 2,
      entityTypes: ["Organization"]
    },
    {
      id: "contact-primary-person",
      label: "Contact primary person",
      description: "Get in touch with the primary contact",
      href: "#",
      icon: "user",
      priority: 3,
      relationshipType: "primaryContact",
      entityTypes: ["Organization"]
    },
    {
      id: "view-all-projects",
      label: "View all projects",
      description: "See all projects with this organization",
      href: "#",
      icon: "folder",
      priority: 4,
      entityTypes: ["Organization"]
    },
    {
      id: "performance-summary",
      label: "Performance summary",
      description: "View vendor performance metrics",
      href: "#",
      icon: "bar-chart",
      priority: 5,
      entityTypes: ["Organization"]
    }
  ]
};
var RelationshipEngine = class {
  constructor(corpus) {
    this.corpus = corpus;
    this.relationships = [];
    this.lookup = {
      bySource: /* @__PURE__ */ new Map(),
      byTarget: /* @__PURE__ */ new Map(),
      byType: /* @__PURE__ */ new Map()
    };
    this.buildRelationships();
  }
  /**
   * Build all relationships from the corpus
   */
  buildRelationships() {
    this.relationships = [];
    this.lookup = {
      bySource: /* @__PURE__ */ new Map(),
      byTarget: /* @__PURE__ */ new Map(),
      byType: /* @__PURE__ */ new Map()
    };
    this.buildExplicitRelationships();
    this.buildInferredRelationships();
    this.buildTemporalRelationships();
    this.buildLookupTables();
  }
  /**
   * Build explicit relationships from entity metadata
   */
  buildExplicitRelationships() {
    for (const entity of this.corpus) {
      if (isFinancialRecord(entity) && entity.entityType === "Bill") {
        const vendorName = entity.metadata?.vendor;
        if (vendorName) {
          const vendorOrg = this.findOrganizationByName(vendorName);
          if (vendorOrg) {
            this.addRelationship({
              id: `bill-vendor-${entity.id}-${vendorOrg.id}`,
              type: "vendor",
              confidence: "explicit",
              sourceEntityId: entity.id,
              targetEntityId: vendorOrg.id,
              targetEntityType: vendorOrg.entityType,
              targetEntityTitle: vendorOrg.title,
              metadata: {
                sourceField: "metadata.vendor",
                targetField: "title"
              }
            });
          }
        }
      }
      if (isOrganizationRecord(entity)) {
        const primaryContactName = entity.primaryContact;
        if (primaryContactName) {
          const contactPerson = this.findPersonByName(primaryContactName);
          if (contactPerson) {
            this.addRelationship({
              id: `org-contact-${entity.id}-${contactPerson.id}`,
              type: "primaryContact",
              confidence: "explicit",
              sourceEntityId: entity.id,
              targetEntityId: contactPerson.id,
              targetEntityType: contactPerson.entityType,
              targetEntityTitle: contactPerson.title,
              metadata: {
                sourceField: "primaryContact",
                targetField: "title"
              }
            });
          }
        }
      }
      if (isPersonRecord(entity)) {
        const associatedOrgName = entity.associatedOrganization;
        if (associatedOrgName) {
          const associatedOrg = this.findOrganizationByName(associatedOrgName);
          if (associatedOrg) {
            this.addRelationship({
              id: `person-org-${entity.id}-${associatedOrg.id}`,
              type: "associatedOrg",
              confidence: "explicit",
              sourceEntityId: entity.id,
              targetEntityId: associatedOrg.id,
              targetEntityType: associatedOrg.entityType,
              targetEntityTitle: associatedOrg.title,
              metadata: {
                sourceField: "associatedOrganization",
                targetField: "title"
              }
            });
          }
        }
      }
    }
  }
  /**
   * Build inferred relationships from text content
   */
  buildInferredRelationships() {
    for (const entity of this.corpus) {
      const personNames = this.extractPersonNames(entity);
      for (const personName of personNames) {
        const person = this.findPersonByName(personName);
        if (person && person.id !== entity.id) {
          this.addRelationship({
            id: `inferred-person-${entity.id}-${person.id}`,
            type: "inferred",
            confidence: "inferred",
            sourceEntityId: entity.id,
            targetEntityId: person.id,
            targetEntityType: person.entityType,
            targetEntityTitle: person.title,
            metadata: {
              sourceField: "text-content",
              targetField: "title",
              matchScore: 0.8
              // Basic fuzzy matching score
            }
          });
        }
      }
      const orgNames = this.extractOrganizationNames(entity);
      for (const orgName of orgNames) {
        const org = this.findOrganizationByName(orgName);
        if (org && org.id !== entity.id) {
          this.addRelationship({
            id: `inferred-org-${entity.id}-${org.id}`,
            type: "inferred",
            confidence: "inferred",
            sourceEntityId: entity.id,
            targetEntityId: org.id,
            targetEntityType: org.entityType,
            targetEntityTitle: org.title,
            metadata: {
              sourceField: "text-content",
              targetField: "title",
              matchScore: 0.8
            }
          });
        }
      }
    }
  }
  /**
   * Build temporal relationships (recent activity with same entities)
   */
  buildTemporalRelationships() {
    const now = /* @__PURE__ */ new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    const projectGroups = /* @__PURE__ */ new Map();
    const clientGroups = /* @__PURE__ */ new Map();
    for (const entity of this.corpus) {
      if (entity.project) {
        if (!projectGroups.has(entity.project)) {
          projectGroups.set(entity.project, []);
        }
        projectGroups.get(entity.project).push(entity);
      }
      if (entity.client) {
        if (!clientGroups.has(entity.client)) {
          clientGroups.set(entity.client, []);
        }
        clientGroups.get(entity.client).push(entity);
      }
    }
    for (const [project, entities] of projectGroups) {
      const recentEntities = entities.filter((e) => new Date(e.updatedAt) > thirtyDaysAgo);
      if (recentEntities.length > 1) {
        for (let i = 0; i < recentEntities.length; i++) {
          for (let j = i + 1; j < recentEntities.length; j++) {
            const entity1 = recentEntities[i];
            const entity2 = recentEntities[j];
            this.addRelationship({
              id: `temporal-project-${entity1.id}-${entity2.id}`,
              type: "temporal",
              confidence: "weak",
              sourceEntityId: entity1.id,
              targetEntityId: entity2.id,
              targetEntityType: entity2.entityType,
              targetEntityTitle: entity2.title,
              metadata: {
                sourceField: "project",
                targetField: "project",
                lastInteraction: entity2.updatedAt
              }
            });
          }
        }
      }
    }
  }
  /**
   * Build lookup tables for fast relationship queries
   */
  buildLookupTables() {
    for (const relationship of this.relationships) {
      if (!this.lookup.bySource.has(relationship.sourceEntityId)) {
        this.lookup.bySource.set(relationship.sourceEntityId, []);
      }
      this.lookup.bySource.get(relationship.sourceEntityId).push(relationship);
      if (!this.lookup.byTarget.has(relationship.targetEntityId)) {
        this.lookup.byTarget.set(relationship.targetEntityId, []);
      }
      this.lookup.byTarget.get(relationship.targetEntityId).push(relationship);
      if (!this.lookup.byType.has(relationship.type)) {
        this.lookup.byType.set(relationship.type, []);
      }
      this.lookup.byType.get(relationship.type).push(relationship);
    }
  }
  /**
   * Add a relationship to the engine
   */
  addRelationship(relationship) {
    this.relationships.push(relationship);
  }
  /**
   * Find organization by name (fuzzy matching)
   */
  findOrganizationByName(name) {
    const normalizedName = name.toLowerCase().trim();
    for (const entity of this.corpus) {
      if (isOrganizationRecord(entity)) {
        const entityName = entity.title.toLowerCase().trim();
        if (entityName === normalizedName || entityName.includes(normalizedName) || normalizedName.includes(entityName)) {
          return entity;
        }
      }
    }
    return null;
  }
  /**
   * Find person by name (fuzzy matching)
   */
  findPersonByName(name) {
    const normalizedName = name.toLowerCase().trim();
    for (const entity of this.corpus) {
      if (isPersonRecord(entity)) {
        const entityName = entity.title.toLowerCase().trim();
        if (entityName === normalizedName || entityName.includes(normalizedName) || normalizedName.includes(entityName)) {
          return entity;
        }
      }
    }
    return null;
  }
  /**
   * Extract person names from entity text content
   */
  extractPersonNames(entity) {
    const names = [];
    const text = `${entity.title} ${entity.summary}`.toLowerCase();
    for (const person of this.corpus) {
      if (isPersonRecord(person) && person.id !== entity.id) {
        const personName = person.title.toLowerCase();
        if (text.includes(personName)) {
          names.push(person.title);
        }
      }
    }
    return names;
  }
  /**
   * Extract organization names from entity text content
   */
  extractOrganizationNames(entity) {
    const names = [];
    const text = `${entity.title} ${entity.summary}`.toLowerCase();
    for (const org of this.corpus) {
      if (isOrganizationRecord(org) && org.id !== entity.id) {
        const orgName = org.title.toLowerCase();
        if (text.includes(orgName)) {
          names.push(org.title);
        }
      }
    }
    return names;
  }
  /**
   * Get relationships for a specific entity
   */
  getRelationships(entityId, options) {
    const relationships = this.lookup.bySource.get(entityId) || [];
    return relationships.filter((rel) => {
      if (options?.type && rel.type !== options.type) return false;
      if (options?.confidence && rel.confidence !== options.confidence) return false;
      if (options?.includeInferred === false && rel.confidence === "inferred") return false;
      return true;
    });
  }
  /**
   * Get smart actions for a specific entity
   */
  getSmartActions(entity, includeInferred = true) {
    const entityType = entity.entityType;
    const availableActions = SMART_ACTIONS[entityType] || [];
    const relationships = this.getRelationships(entity.id, { includeInferred });
    const applicableActions = availableActions.filter((action) => {
      if (!action.relationshipType) return true;
      return relationships.some((rel) => rel.type === action.relationshipType);
    });
    return applicableActions.sort((a, b) => a.priority - b.priority);
  }
  /**
   * Get related entities for a specific entity
   */
  getRelatedEntities(entityId, options) {
    const relationships = this.getRelationships(entityId, options);
    const relatedEntities = [];
    for (const rel of relationships) {
      const entity = this.corpus.find((e) => e.id === rel.targetEntityId);
      if (entity) {
        relatedEntities.push(entity);
      }
    }
    const uniqueEntities = relatedEntities.filter(
      (entity, index, self) => index === self.findIndex((e) => e.id === entity.id)
    );
    return options?.limit ? uniqueEntities.slice(0, options.limit) : uniqueEntities;
  }
  /**
   * Get all relationships (for debugging)
   */
  getAllRelationships() {
    return [...this.relationships];
  }
  /**
   * Get relationship statistics
   */
  getStats() {
    const stats = {
      total: this.relationships.length,
      byType: {},
      byConfidence: {}
    };
    for (const rel of this.relationships) {
      stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1;
      stats.byConfidence[rel.confidence] = (stats.byConfidence[rel.confidence] || 0) + 1;
    }
    return stats;
  }
};

// src/data/searchService.ts
var GROUP_ORDER = [
  "Buildertrend",
  "Document",
  "DailyLog",
  "Person",
  "Organization",
  "ClientInvoice",
  "PurchaseOrder",
  "Bill",
  "Receipt",
  "Payment"
];
var FACET_KEYS = [
  "entityType",
  "project",
  "status",
  "documentType",
  "client",
  "issuedDate",
  "totalValue",
  "personType",
  "contactOrganization",
  "organizationType",
  "tradeFocus",
  "costCodeCategory",
  "costCode",
  "groupBy"
];
var CORPUS = [];
var RELATIONSHIP_ENGINE = null;
async function loadCorpus() {
  if (CORPUS.length > 0) {
    return CORPUS;
  }
  try {
    const allRecords = [];
    try {
      const buildertrendResponse = await fetch("./buildertrend-corpus.json");
      const buildertrendData = await buildertrendResponse.json();
      allRecords.push(...buildertrendData);
    } catch (error) {
      console.warn("Could not load Buildertrend corpus:", error);
    }
    const indexResponse = await fetch("./corpus-parts/index.json");
    const indexData = await indexResponse.json();
    for (const fileInfo of indexData.files) {
      const response = await fetch(`./corpus-parts/${fileInfo.filename}`);
      const partData = await response.json();
      allRecords.push(...partData);
    }
    CORPUS = allRecords.map((record) => normalizeRecord(record));
    try {
      RELATIONSHIP_ENGINE = new RelationshipEngine(CORPUS);
      console.log("\u2705 Relationship engine initialized with", CORPUS.length, "records");
    } catch (error) {
      console.warn("\u26A0\uFE0F Failed to initialize relationship engine:", error);
      RELATIONSHIP_ENGINE = null;
    }
    return CORPUS;
  } catch (error) {
    console.error("Error loading corpus:", error);
    CORPUS = [];
    return CORPUS;
  }
}
function normalizeRecord(record) {
  const cleanMetadata = {};
  if (record.metadata) {
    for (const [key, value] of Object.entries(record.metadata)) {
      if (value !== void 0) {
        cleanMetadata[key] = value;
      }
    }
  }
  const baseRecord = {
    ...record,
    tags: record.tags ?? [],
    metadata: cleanMetadata
  };
  switch (record.entityType) {
    case "Buildertrend":
      return {
        ...baseRecord,
        entityType: "Buildertrend",
        path: record.path,
        description: record.description,
        icon: record.icon,
        url: record.url,
        triggerQueries: record.triggerQueries
      };
    case "Document":
      return {
        ...baseRecord,
        entityType: "Document",
        documentType: record.documentType,
        author: record.author
      };
    case "Person":
      return {
        ...baseRecord,
        entityType: "Person",
        personType: record.personType,
        jobTitle: record.jobTitle,
        associatedOrganization: record.associatedOrganization,
        email: record.email,
        phone: record.phone,
        location: record.location,
        tradeFocus: record.tradeFocus
      };
    case "Organization":
      return {
        ...baseRecord,
        entityType: "Organization",
        organizationType: record.organizationType,
        tradeFocus: record.tradeFocus,
        serviceArea: record.serviceArea,
        primaryContact: record.primaryContact,
        phone: record.phone,
        email: record.email,
        website: record.website
      };
    default:
      return {
        ...baseRecord,
        entityType: record.entityType,
        totalValue: record.totalValue,
        issuedDate: record.issuedDate,
        dueDate: record.dueDate,
        lineItems: record.lineItems ?? []
      };
  }
}
function buildHaystack(record) {
  const base = [
    record.title,
    record.summary,
    record.project,
    record.client,
    record.status,
    record.tags.join(" "),
    ...Object.values(record.metadata ?? {}).map((value) => value == null ? "" : String(value))
  ];
  if (isBuildertrendRecord(record)) {
    base.push(
      record.path,
      record.description,
      record.icon,
      record.url,
      ...record.triggerQueries
    );
  } else if (isFinancialRecord(record)) {
    record.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
      if (item.costCode) base.push(item.costCode);
      if (item.costCodeName) base.push(item.costCodeName);
      if (item.costCodeCategory) base.push(item.costCodeCategory);
      if (item.costCodeCategoryName) base.push(item.costCodeCategoryName);
    });
  } else if (isPersonRecord(record)) {
    base.push(
      record.personType,
      record.jobTitle,
      record.associatedOrganization ?? "",
      record.email,
      record.phone,
      record.location,
      record.tradeFocus ?? ""
    );
  } else if (isOrganizationRecord(record)) {
    base.push(
      record.organizationType,
      record.tradeFocus,
      record.serviceArea,
      record.primaryContact,
      record.phone,
      record.email,
      record.website ?? ""
    );
  } else if (isDailyLogRecord(record)) {
    base.push(
      record.author,
      record.logDate,
      record.structuredNotes.progress ?? "",
      record.structuredNotes.issues ?? "",
      record.structuredNotes.materialsDelivered ?? "",
      record.structuredNotes.additional ?? "",
      record.weatherNotes ?? "",
      record.weatherConditions?.description ?? "",
      record.attachments.join(" ")
    );
  }
  return base.filter((chunk) => Boolean(chunk)).join(" ").toLowerCase();
}
function tokenize(query) {
  return query.toLowerCase().split(/\s+/).map((token) => token.trim()).filter(Boolean);
}
function parseBooleanQuery(query) {
  const trimmed = query.trim();
  const andMatch = trimmed.match(/^(.+?)\s+AND\s+(.+)$/);
  const orMatch = trimmed.match(/^(.+?)\s+OR\s+(.+)$/);
  const notMatch = trimmed.match(/^(.+?)\s+NOT\s+(.+)$/);
  if (andMatch) {
    return {
      type: "boolean",
      operator: "AND",
      left: parseBooleanQuery(andMatch[1].trim()),
      right: parseBooleanQuery(andMatch[2].trim())
    };
  }
  if (orMatch) {
    return {
      type: "boolean",
      operator: "OR",
      left: parseBooleanQuery(orMatch[1].trim()),
      right: parseBooleanQuery(orMatch[2].trim())
    };
  }
  if (notMatch) {
    return {
      type: "boolean",
      operator: "NOT",
      left: parseBooleanQuery(notMatch[1].trim()),
      right: parseBooleanQuery(notMatch[2].trim())
    };
  }
  return {
    type: "simple",
    query: trimmed
  };
}
function isBooleanQuery2(query) {
  const parsed = parseBooleanQuery(query);
  return parsed.type === "boolean";
}
function parseMonetaryQuery(query) {
  const trimmedQuery = query.trim();
  if (trimmedQuery.startsWith("$")) {
    const amountPart = trimmedQuery.slice(1).trim();
    return {
      isMonetary: true,
      searchQuery: amountPart,
      originalQuery: query
    };
  }
  return {
    isMonetary: false,
    searchQuery: query,
    originalQuery: query
  };
}
function hasMonetaryPotential(query) {
  return hasMonetaryValue(query);
}
function matchesMonetaryString(queryStr, dataValue) {
  return matchesMonetaryQuery(queryStr, dataValue);
}
function getVisibleMonetaryMatches(record, query) {
  const { amounts } = extractMonetaryTokens2(query);
  if (amounts.length === 0) {
    return { hasVisibleMatches: false, hasExactVisibleMatches: false, visibleMatchTypes: [] };
  }
  const visibleMatchTypes = [];
  let hasVisibleMatches = false;
  let hasExactVisibleMatches = false;
  for (const queryAmount of amounts) {
    if (record.totalValue === queryAmount) {
      visibleMatchTypes.push("totalValue");
      hasVisibleMatches = true;
      hasExactVisibleMatches = true;
    } else if (matchesMonetaryQuery(query, record.totalValue)) {
      visibleMatchTypes.push("totalValue");
      hasVisibleMatches = true;
    }
  }
  for (const lineItem of record.lineItems) {
    for (const queryAmount of amounts) {
      if (lineItem.lineItemTotal === queryAmount) {
        visibleMatchTypes.push("lineItemTotal");
        hasVisibleMatches = true;
        hasExactVisibleMatches = true;
      } else if (matchesMonetaryQuery(query, lineItem.lineItemTotal)) {
        visibleMatchTypes.push("lineItemTotal");
        hasVisibleMatches = true;
      }
      if (lineItem.lineItemUnitPrice === queryAmount) {
        visibleMatchTypes.push("lineItemUnitPrice");
        hasVisibleMatches = true;
        hasExactVisibleMatches = true;
      } else if (matchesMonetaryQuery(query, lineItem.lineItemUnitPrice)) {
        visibleMatchTypes.push("lineItemUnitPrice");
        hasVisibleMatches = true;
      }
    }
  }
  return {
    hasVisibleMatches,
    hasExactVisibleMatches,
    visibleMatchTypes: [...new Set(visibleMatchTypes)]
    // Remove duplicates
  };
}
function isCloseMatch(value1, value2, tolerance = 0.01) {
  return Math.abs(value1 - value2) <= tolerance;
}
function parseRangeQuery2(query) {
  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
    // 100-200
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i,
    // 100 to 200
    /\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)/,
    // $100-$200
    /\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/i
    // $100 to $200
  ];
  for (const pattern of rangePatterns) {
    const match = query.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }
  return null;
}
function isInRange(value, range) {
  return value >= range.min && value <= range.max;
}
function extractMonetaryTokens2(query) {
  const tokens = tokenize(query);
  const amounts = [];
  const textTokens = [];
  const range = parseRangeQuery2(query);
  if (range) {
    return { amounts, textTokens, range };
  }
  const monetaryAmounts = extractMonetaryAmounts(query);
  for (const monetary of monetaryAmounts) {
    amounts.push(monetary.amount / 100);
  }
  for (const token of tokens) {
    const parsed = parseMonetaryString(token);
    if (!parsed) {
      textTokens.push(token);
    }
  }
  return { amounts, textTokens, range: null };
}
function matchesQuery(record, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return true;
  }
  const haystack = buildHaystack(record);
  return tokens.every((token) => haystack.includes(token));
}
function matchesBooleanQuery(record, parsedQuery) {
  console.log(`\u{1F50D} matchesBooleanQuery called for record "${record.title}" with query:`, JSON.stringify(parsedQuery, null, 2));
  if (parsedQuery.type === "simple") {
    const result2 = matchesQueryWithMonetarySupport(record, parsedQuery.query);
    console.log(`\u{1F50D} Simple query "${parsedQuery.query}" result: ${result2}`);
    return result2;
  }
  const booleanQuery = parsedQuery;
  const leftMatch = typeof booleanQuery.left === "string" ? matchesQueryWithMonetarySupport(record, booleanQuery.left) : matchesBooleanQuery(record, booleanQuery.left);
  console.log(`\u{1F50D} Left side match: ${leftMatch}`);
  if (booleanQuery.operator === "NOT") {
    if (!booleanQuery.right) {
      const result3 = !leftMatch;
      console.log(`\u{1F50D} NOT result (no right): ${result3}`);
      return result3;
    }
    const rightMatch2 = typeof booleanQuery.right === "string" ? matchesQueryWithMonetarySupport(record, booleanQuery.right) : matchesBooleanQuery(record, booleanQuery.right);
    console.log(`\u{1F50D} Right side match for NOT: ${rightMatch2}`);
    const result2 = leftMatch && !rightMatch2;
    console.log(`\u{1F50D} NOT result: ${leftMatch} && !${rightMatch2} = ${result2}`);
    return result2;
  }
  if (!booleanQuery.right) {
    console.log(`\u{1F50D} No right side, returning left match: ${leftMatch}`);
    return leftMatch;
  }
  const rightMatch = typeof booleanQuery.right === "string" ? matchesQueryWithMonetarySupport(record, booleanQuery.right) : matchesBooleanQuery(record, booleanQuery.right);
  console.log(`\u{1F50D} Right side match: ${rightMatch}`);
  let result;
  switch (booleanQuery.operator) {
    case "AND":
      result = leftMatch && rightMatch;
      console.log(`\u{1F50D} AND result: ${leftMatch} && ${rightMatch} = ${result}`);
      break;
    case "OR":
      result = leftMatch || rightMatch;
      console.log(`\u{1F50D} OR result: ${leftMatch} || ${rightMatch} = ${result}`);
      break;
    default:
      result = leftMatch;
      console.log(`\u{1F50D} Default result: ${result}`);
  }
  return result;
}
function matchesQueryWithMonetarySupport(record, query) {
  console.log(`\u{1F50D} matchesQueryWithMonetarySupport called for record "${record.title}" with query: "${query}"`);
  if (query.startsWith("$")) {
    const amountPart = query.slice(1).trim();
    console.log(`\u{1F50D} Monetary query detected, amount part: "${amountPart}"`);
    const monetaryMatch = matchesMonetaryQuery2(record, amountPart);
    console.log(`\u{1F50D} Monetary match for "${amountPart}": ${monetaryMatch}`);
    return monetaryMatch;
  }
  const textMatch = matchesQuery(record, query);
  console.log(`\u{1F50D} Text match for "${query}": ${textMatch}`);
  if (textMatch) {
    return true;
  }
  const hasMonetary = hasMonetaryPotential(query);
  console.log(`\u{1F50D} Has monetary potential for "${query}": ${hasMonetary}`);
  if (hasMonetary) {
    const monetaryMatch = matchesMonetaryQuery2(record, query);
    console.log(`\u{1F50D} Monetary match for "${query}": ${monetaryMatch}`);
    return monetaryMatch;
  }
  console.log(`\u{1F50D} No match for "${query}"`);
  return false;
}
function matchesHybridQuery(record, query) {
  const regularMatch = matchesQuery(record, query);
  if (regularMatch) {
    return true;
  }
  if (hasMonetaryPotential(query)) {
    return matchesMonetaryQuery2(record, query);
  }
  return false;
}
function matchesMonetaryQuery2(record, query) {
  const { amounts, textTokens, range } = extractMonetaryTokens2(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return true;
  }
  if (!isFinancialRecord(record)) {
    return false;
  }
  const financialRecord = record;
  if (range) {
    if (isInRange(financialRecord.totalValue, range)) {
      return true;
    }
    for (const lineItem of financialRecord.lineItems) {
      if (isInRange(lineItem.lineItemTotal, range) || isInRange(lineItem.lineItemUnitPrice, range)) {
        return true;
      }
    }
  }
  if (amounts.length > 0) {
    for (const queryAmount of amounts) {
      if (isCloseMatch(financialRecord.totalValue, queryAmount)) {
        return true;
      }
    }
    for (const lineItem of financialRecord.lineItems) {
      for (const queryAmount of amounts) {
        if (isCloseMatch(lineItem.lineItemTotal, queryAmount) || isCloseMatch(lineItem.lineItemUnitPrice, queryAmount)) {
          return true;
        }
      }
    }
  }
  const tokens = tokenize(query);
  for (const token of tokens) {
    if (matchesMonetaryString(token, financialRecord.totalValue)) {
      return true;
    }
    for (const lineItem of financialRecord.lineItems) {
      if (matchesMonetaryString(token, lineItem.lineItemTotal) || matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
        return true;
      }
    }
  }
  const isExplicitMonetary = query.trim().startsWith("$");
  if (isExplicitMonetary) {
    return false;
  }
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const monetaryFields = [];
      if (lineItem.fieldMetadata) {
        if (lineItem.fieldMetadata.lineItemTitle === "monetary") {
          monetaryFields.push(lineItem.lineItemTitle);
        }
        if (lineItem.fieldMetadata.lineItemDescription === "monetary") {
          monetaryFields.push(lineItem.lineItemDescription);
        }
        if (lineItem.fieldMetadata.lineItemType === "monetary") {
          monetaryFields.push(lineItem.lineItemType);
        }
      } else {
        monetaryFields.push(lineItem.lineItemType);
      }
      const lineItemText = monetaryFields.join(" ").toLowerCase();
      if (lineItemText && textTokens.every((token) => lineItemText.includes(token))) {
        return true;
      }
    }
  }
  return false;
}
function matchesSelections(record, selections) {
  if (!selections) {
    return true;
  }
  for (const key of Object.keys(selections)) {
    const values = selections[key];
    if (!values || values.size === 0) {
      continue;
    }
    if (key === "groupBy") {
      continue;
    }
    const facetValue = getFacetValue(record, key);
    if (!facetValue || !values.has(facetValue)) {
      return false;
    }
  }
  return true;
}
function getFacetValue(record, key) {
  switch (key) {
    case "entityType":
      return record.entityType;
    case "project":
      return record.project;
    case "status":
      return record.status;
    case "documentType":
      return record.entityType === "Document" ? record.documentType : void 0;
    case "client":
      return record.client;
    case "issuedDate":
      return record.entityType === "Document" ? void 0 : bucketIssuedDate(record.issuedDate);
    case "totalValue":
      if (record.entityType === "Document") {
        return void 0;
      }
      return bucketTotal(record.totalValue);
    case "personType":
      return isPersonRecord(record) ? record.personType : void 0;
    case "contactOrganization":
      if (isPersonRecord(record)) {
        return record.associatedOrganization ?? void 0;
      }
      if (isOrganizationRecord(record)) {
        return record.title;
      }
      return void 0;
    case "organizationType":
      return isOrganizationRecord(record) ? record.organizationType : void 0;
    case "tradeFocus": {
      if (isPersonRecord(record) && record.tradeFocus) {
        return record.tradeFocus;
      }
      if (isOrganizationRecord(record)) {
        return record.tradeFocus;
      }
      const metadataTrade = record.metadata?.tradeFocus;
      return typeof metadataTrade === "string" ? metadataTrade : void 0;
    }
    case "costCodeCategory": {
      if (isFinancialRecord(record) && record.lineItems.length > 0) {
        const categories = record.lineItems.map((item) => item.costCodeCategory).filter(Boolean);
        if (categories.length > 0) {
          const categoryCounts = categories.reduce((acc, cat) => {
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0][0];
        }
      }
      return void 0;
    }
    case "costCode": {
      if (isFinancialRecord(record) && record.lineItems.length > 0) {
        const codes = record.lineItems.map((item) => item.costCode).filter(Boolean);
        if (codes.length > 0) {
          const codeCounts = codes.reduce((acc, code) => {
            acc[code] = (acc[code] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(codeCounts).sort(([, a], [, b]) => b - a)[0][0];
        }
      }
      return void 0;
    }
    case "groupBy":
      return void 0;
    default:
      return void 0;
  }
}
function bucketTotal(total) {
  if (total < 1e4) return "< $10k";
  if (total < 5e4) return "$10k\u2013$50k";
  if (total < 1e5) return "$50k\u2013$100k";
  return "$100k+";
}
function bucketIssuedDate(dateString) {
  const date = new Date(dateString);
  const now = /* @__PURE__ */ new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1e3 * 60 * 60 * 24));
  if (diffInDays <= 7) return "Last 7 days";
  if (diffInDays <= 30) return "Last 30 days";
  if (diffInDays <= 90) return "Last 3 months";
  if (diffInDays <= 180) return "Last 6 months";
  if (diffInDays <= 365) return "Last year";
  if (diffInDays <= 730) return "Last 2 years";
  return "Older than 2 years";
}
async function computeFacets(records) {
  const facetMaps = {};
  for (const key of FACET_KEYS) {
    if (key !== "groupBy") {
      facetMaps[key] = /* @__PURE__ */ new Map();
    }
  }
  const batchSize = 200;
  let currentIndex = 0;
  while (currentIndex < records.length) {
    const endIndex = Math.min(currentIndex + batchSize, records.length);
    const batch = records.slice(currentIndex, endIndex);
    batch.forEach((record) => {
      for (const key of FACET_KEYS) {
        if (key === "groupBy") {
          continue;
        }
        const value = getFacetValue(record, key);
        if (!value) {
          continue;
        }
        const map = facetMaps[key];
        if (!map) {
          continue;
        }
        map.set(value, (map.get(value) ?? 0) + 1);
      }
    });
    currentIndex = endIndex;
    if (currentIndex < records.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  const facets = {};
  for (const key of FACET_KEYS) {
    if (key === "groupBy") {
      facets[key] = [
        { key: "groupBy", value: "None", count: records.length },
        { key: "groupBy", value: "Type", count: records.length },
        { key: "groupBy", value: "Project", count: records.length },
        { key: "groupBy", value: "Status", count: records.length },
        { key: "groupBy", value: "Client", count: records.length }
      ];
      continue;
    }
    const map = facetMaps[key];
    if (!map || map.size === 0) {
      continue;
    }
    const values = Array.from(map.entries()).map(([value, count]) => ({ key, value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    facets[key] = values;
  }
  return facets;
}
function calculateRelevanceScore(record, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return 0;
  }
  const haystack = buildHaystack(record);
  const titleLower = record.title.toLowerCase();
  const summaryLower = record.summary.toLowerCase();
  let score = 0;
  if (titleLower.includes(query.toLowerCase())) {
    score += 100;
  }
  const titleMatches = tokens.filter((token) => titleLower.includes(token)).length;
  score += titleMatches * 20;
  const summaryMatches = tokens.filter((token) => summaryLower.includes(token)).length;
  score += summaryMatches * 10;
  const contentMatches = tokens.filter((token) => haystack.includes(token)).length;
  score += contentMatches * 5;
  if (titleLower.includes(query.toLowerCase())) {
    score += 50;
  }
  if (summaryLower.includes(query.toLowerCase())) {
    score += 25;
  }
  return score;
}
function calculateBooleanRelevanceScore(record, parsedQuery) {
  if (parsedQuery.type === "simple") {
    return calculateRelevanceScoreWithMonetarySupport(record, parsedQuery.query);
  }
  const booleanQuery = parsedQuery;
  const leftScore = typeof booleanQuery.left === "string" ? calculateRelevanceScoreWithMonetarySupport(record, booleanQuery.left) : calculateBooleanRelevanceScore(record, booleanQuery.left);
  if (booleanQuery.operator === "NOT") {
    return leftScore > 0 ? 10 : 0;
  }
  if (!booleanQuery.right) {
    return leftScore;
  }
  const rightScore = typeof booleanQuery.right === "string" ? calculateRelevanceScoreWithMonetarySupport(record, booleanQuery.right) : calculateBooleanRelevanceScore(record, booleanQuery.right);
  switch (booleanQuery.operator) {
    case "AND":
      return Math.min(leftScore, rightScore);
    case "OR":
      return Math.max(leftScore, rightScore);
    default:
      return leftScore;
  }
}
function calculateRelevanceScoreWithMonetarySupport(record, query) {
  const textScore = calculateRelevanceScore(record, query);
  if (textScore > 0) {
    return textScore;
  }
  if (hasMonetaryPotential(query)) {
    return calculateMonetaryRelevanceScore(record, query);
  }
  return 0;
}
function calculateHybridRelevanceScore(record, query) {
  const regularScore = calculateRelevanceScore(record, query);
  if (regularScore > 0) {
    return regularScore;
  }
  if (hasMonetaryPotential(query)) {
    return calculateMonetaryRelevanceScore(record, query);
  }
  return 0;
}
function calculateMonetaryRelevanceScore(record, query) {
  const { amounts, textTokens, range } = extractMonetaryTokens2(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return 0;
  }
  if (!isFinancialRecord(record)) {
    return 0;
  }
  const financialRecord = record;
  let score = 0;
  const visibleMatches = getVisibleMonetaryMatches(financialRecord, query);
  if (visibleMatches.hasVisibleMatches) {
    score += 2e3;
    for (const matchType of visibleMatches.visibleMatchTypes) {
      switch (matchType) {
        case "totalValue":
          score += 500;
          break;
        case "lineItemTotal":
          score += 300;
          break;
        case "lineItemUnitPrice":
          score += 200;
          break;
      }
    }
  }
  if (visibleMatches.hasExactVisibleMatches) {
    score += 1e3;
  }
  if (range) {
    if (isInRange(financialRecord.totalValue, range)) {
      const rangeCenter = (range.min + range.max) / 2;
      const distanceFromCenter = Math.abs(financialRecord.totalValue - rangeCenter);
      const rangeSize = range.max - range.min;
      const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
      score += Math.round(800 * (1 - normalizedDistance));
    }
    for (const lineItem of financialRecord.lineItems) {
      if (isInRange(lineItem.lineItemTotal, range)) {
        const rangeCenter = (range.min + range.max) / 2;
        const distanceFromCenter = Math.abs(lineItem.lineItemTotal - rangeCenter);
        const rangeSize = range.max - range.min;
        const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
        score += Math.round(700 * (1 - normalizedDistance));
      }
      if (isInRange(lineItem.lineItemUnitPrice, range)) {
        const rangeCenter = (range.min + range.max) / 2;
        const distanceFromCenter = Math.abs(lineItem.lineItemUnitPrice - rangeCenter);
        const rangeSize = range.max - range.min;
        const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
        score += Math.round(600 * (1 - normalizedDistance));
      }
    }
  }
  if (amounts.length > 0) {
    for (const queryAmount of amounts) {
      const totalValue = financialRecord.totalValue;
      if (totalValue === queryAmount) {
        score += 1e3;
      } else if (isCloseMatch(totalValue, queryAmount, 0.01)) {
        score += 800;
      } else if (isCloseMatch(totalValue, queryAmount, 1)) {
        score += 600;
      }
    }
    for (const lineItem of financialRecord.lineItems) {
      for (const queryAmount of amounts) {
        if (lineItem.lineItemTotal === queryAmount) {
          score += 900;
        } else if (isCloseMatch(lineItem.lineItemTotal, queryAmount, 0.01)) {
          score += 700;
        } else if (isCloseMatch(lineItem.lineItemTotal, queryAmount, 1)) {
          score += 500;
        }
        if (lineItem.lineItemUnitPrice === queryAmount) {
          score += 800;
        } else if (isCloseMatch(lineItem.lineItemUnitPrice, queryAmount, 0.01)) {
          score += 600;
        } else if (isCloseMatch(lineItem.lineItemUnitPrice, queryAmount, 1)) {
          score += 400;
        }
      }
    }
  }
  const tokens = tokenize(query);
  for (const token of tokens) {
    if (matchesMonetaryString(token, financialRecord.totalValue)) {
      score += 750;
    }
    for (const lineItem of financialRecord.lineItems) {
      if (matchesMonetaryString(token, lineItem.lineItemTotal)) {
        score += 650;
      }
      if (matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
        score += 550;
      }
    }
  }
  const isExplicitMonetary = query.trim().startsWith("$");
  if (!isExplicitMonetary && textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const monetaryFields = [];
      if (lineItem.fieldMetadata) {
        if (lineItem.fieldMetadata.lineItemTitle === "monetary") {
          monetaryFields.push(lineItem.lineItemTitle);
        }
        if (lineItem.fieldMetadata.lineItemDescription === "monetary") {
          monetaryFields.push(lineItem.lineItemDescription);
        }
        if (lineItem.fieldMetadata.lineItemType === "monetary") {
          monetaryFields.push(lineItem.lineItemType);
        }
      } else {
        monetaryFields.push(lineItem.lineItemType);
      }
      const lineItemText = monetaryFields.join(" ").toLowerCase();
      if (lineItemText) {
        const lineItemMatches = textTokens.filter((token) => lineItemText.includes(token)).length;
        score += lineItemMatches * 50;
      }
    }
    if (financialRecord.fieldMetadata) {
      const titleLower = record.title.toLowerCase();
      const summaryLower = record.summary.toLowerCase();
      if (financialRecord.fieldMetadata.title === "monetary") {
        const titleMatches = textTokens.filter((token) => titleLower.includes(token)).length;
        score += titleMatches * 10;
      }
      if (financialRecord.fieldMetadata.summary === "monetary") {
        const summaryMatches = textTokens.filter((token) => summaryLower.includes(token)).length;
        score += summaryMatches * 5;
      }
    }
  }
  return score;
}
async function sortByRelevance(records, query, isMonetary = false) {
  if (records.length <= 50) {
    return [...records].sort((a, b) => {
      let scoreA;
      let scoreB;
      const isBoolean = isBooleanQuery2(query);
      const parsedQuery = isBoolean ? parseBooleanQuery(query) : null;
      if (isBoolean && parsedQuery) {
        scoreA = calculateBooleanRelevanceScore(a, parsedQuery);
        scoreB = calculateBooleanRelevanceScore(b, parsedQuery);
      } else if (isMonetary) {
        scoreA = calculateMonetaryRelevanceScore(a, query);
        scoreB = calculateMonetaryRelevanceScore(b, query);
      } else if (hasMonetaryPotential(query)) {
        scoreA = calculateHybridRelevanceScore(a, query);
        scoreB = calculateHybridRelevanceScore(b, query);
      } else {
        scoreA = calculateRelevanceScore(a, query);
        scoreB = calculateRelevanceScore(b, query);
      }
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }
  const recordsWithScores = await Promise.all(records.map(async (record) => {
    let score;
    const isBoolean = isBooleanQuery2(query);
    const parsedQuery = isBoolean ? parseBooleanQuery(query) : null;
    if (isBoolean && parsedQuery) {
      score = calculateBooleanRelevanceScore(record, parsedQuery);
    } else if (isMonetary) {
      score = calculateMonetaryRelevanceScore(record, query);
    } else if (hasMonetaryPotential(query)) {
      score = calculateHybridRelevanceScore(record, query);
    } else {
      score = calculateRelevanceScore(record, query);
    }
    return { record, score, updatedAt: new Date(record.updatedAt).getTime() };
  }));
  return recordsWithScores.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    return b.updatedAt - a.updatedAt;
  }).map((item) => item.record);
}
function sortByRecency(records) {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
async function filterRecords({ query, selections, isMonetarySearch }) {
  console.log("\u{1F50D} filterRecords called with:", {
    query,
    selections: Object.keys(selections || {}),
    isMonetarySearch
  });
  const { isMonetary, searchQuery } = parseMonetaryQuery(query);
  const corpus = await loadCorpus();
  const buildertrendMatches = [];
  const otherMatches = [];
  console.log("\u{1F50D} Starting search for:", searchQuery, "with corpus size:", corpus.length);
  console.log("\u{1F50D} Original query:", query);
  console.log("\u{1F50D} Is monetary:", isMonetary);
  const isBoolean = isBooleanQuery2(searchQuery);
  const parsedQuery = isBoolean ? parseBooleanQuery(searchQuery) : null;
  console.log("\u{1F50D} Is boolean query:", isBoolean);
  if (isBoolean && parsedQuery) {
    console.log("\u{1F50D} Parsed boolean query:", JSON.stringify(parsedQuery, null, 2));
  }
  const batchSize = 100;
  let currentIndex = 0;
  while (currentIndex < corpus.length) {
    const endIndex = Math.min(currentIndex + batchSize, corpus.length);
    const batch = corpus.slice(currentIndex, endIndex);
    batch.forEach((record, batchIndex) => {
      const index = currentIndex + batchIndex;
      let matchesQueryResult;
      if (isBuildertrendRecord(record)) {
        console.log(`Checking Buildertrend record ${index}:`, record.title, "triggerQueries:", record.triggerQueries);
        matchesQueryResult = record.triggerQueries.some((triggerQuery) => {
          const match = triggerQuery.toLowerCase() === searchQuery.toLowerCase();
          if (match) {
            console.log("Found exact match:", triggerQuery, "===", searchQuery);
          }
          return match;
        });
        if (matchesQueryResult) {
          console.log("Buildertrend match found:", record.title, "for query:", searchQuery);
          buildertrendMatches.push(record);
        }
        return;
      }
      if (isBoolean && parsedQuery) {
        matchesQueryResult = matchesBooleanQuery(record, parsedQuery);
      } else if (isMonetary) {
        matchesQueryResult = matchesMonetaryQuery2(record, searchQuery);
      } else if (hasMonetaryPotential(searchQuery)) {
        matchesQueryResult = matchesHybridQuery(record, searchQuery);
      } else {
        matchesQueryResult = matchesQuery(record, searchQuery);
      }
      if (matchesQueryResult && matchesSelections(record, selections)) {
        otherMatches.push(record);
      }
    });
    currentIndex = endIndex;
    if (currentIndex < corpus.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  const sortedOtherMatches = searchQuery.trim() ? await sortByRelevance(otherMatches, searchQuery, isMonetary) : sortByRecency(otherMatches);
  console.log('Search results for "' + searchQuery + '":', {
    buildertrendMatches: buildertrendMatches.length,
    otherMatches: sortedOtherMatches.length,
    total: buildertrendMatches.length + sortedOtherMatches.length,
    isBoolean
  });
  return [...buildertrendMatches, ...sortedOtherMatches];
}
function determineGroupEntityType(records) {
  if (records.length === 0) {
    return "Document";
  }
  const firstType = records[0].entityType;
  if (records.every((record) => record.entityType === firstType)) {
    return firstType;
  }
  const typeCounts = /* @__PURE__ */ new Map();
  records.forEach((record) => {
    typeCounts.set(record.entityType, (typeCounts.get(record.entityType) || 0) + 1);
  });
  let mostCommonType = "Document";
  let maxCount = 0;
  for (const [type, count] of typeCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonType = type;
    }
  }
  return mostCommonType;
}
async function buildGroups(records, groupBy) {
  if (!groupBy || groupBy === "None") {
    const typeGroups = /* @__PURE__ */ new Map();
    const batchSize2 = 200;
    let currentIndex2 = 0;
    while (currentIndex2 < records.length) {
      const endIndex = Math.min(currentIndex2 + batchSize2, records.length);
      const batch = records.slice(currentIndex2, endIndex);
      batch.forEach((record) => {
        if (!typeGroups.has(record.entityType)) {
          typeGroups.set(record.entityType, []);
        }
        typeGroups.get(record.entityType).push(record);
      });
      currentIndex2 = endIndex;
      if (currentIndex2 < records.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    return Array.from(typeGroups.entries()).sort((a, b) => {
      const orderA = GROUP_ORDER.indexOf(a[0]);
      const orderB = GROUP_ORDER.indexOf(b[0]);
      if (orderA !== -1 || orderB !== -1) {
        const safeOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
        const safeOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
        if (safeOrderA !== safeOrderB) {
          return safeOrderA - safeOrderB;
        }
      }
      return a[0].localeCompare(b[0]);
    }).map(([entityType, items]) => ({
      entityType,
      items,
      groupTitle: entityType
    }));
  }
  const map = /* @__PURE__ */ new Map();
  const batchSize = 200;
  let currentIndex = 0;
  while (currentIndex < records.length) {
    const endIndex = Math.min(currentIndex + batchSize, records.length);
    const batch = records.slice(currentIndex, endIndex);
    batch.forEach((record) => {
      let groupKey;
      switch (groupBy) {
        case "Type":
          groupKey = record.entityType;
          break;
        case "Project":
          groupKey = record.project || "No Project";
          break;
        case "Status":
          groupKey = record.status || "No Status";
          break;
        case "Client":
          groupKey = record.client || "No Client";
          break;
        default:
          groupKey = record.entityType;
      }
      if (!map.has(groupKey)) {
        map.set(groupKey, []);
      }
      map.get(groupKey).push(record);
    });
    currentIndex = endIndex;
    if (currentIndex < records.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  const sortedEntries = Array.from(map.entries()).sort((a, b) => {
    const aIsEmpty = a[0].startsWith("No ");
    const bIsEmpty = b[0].startsWith("No ");
    if (aIsEmpty && !bIsEmpty) return 1;
    if (!aIsEmpty && bIsEmpty) return -1;
    if (groupBy === "Type") {
      const orderA = GROUP_ORDER.indexOf(a[0]);
      const orderB = GROUP_ORDER.indexOf(b[0]);
      if (orderA !== -1 || orderB !== -1) {
        const safeOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
        const safeOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
        if (safeOrderA !== safeOrderB) {
          return safeOrderA - safeOrderB;
        }
      }
    }
    return a[0].localeCompare(b[0]);
  });
  return sortedEntries.map(([groupKey, items]) => ({
    entityType: groupBy === "Type" ? groupKey : determineGroupEntityType(items),
    items,
    groupTitle: groupKey
  })).filter((group) => group.items.length > 0);
}
function applyGroupLimits(groups, limits) {
  return groups.map((group) => {
    const limit = limits[group.entityType] ?? limits["Document"] ?? 4;
    return {
      entityType: group.entityType,
      items: group.items.slice(0, Math.max(0, limit))
    };
  }).filter((group) => group.items.length > 0);
}
function wait(ms) {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    globalThis.setTimeout(resolve, ms);
  });
}
function generateNormalRandom(mean, variance) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * Math.sqrt(variance);
}
async function runSearch(options, overrides) {
  console.log("\u{1F680} runSearch called with options:", {
    query: options.query,
    selections: Object.keys(options.selections || {}),
    isMonetarySearch: options.isMonetarySearch
  });
  const settings = settingsStore.getState();
  const meanDelay = overrides?.delayMs ?? settings.searchDelayMs;
  const variance = settings.searchDelayVarianceMs;
  const groupLimits = overrides?.groupLimits ?? settings.groupLimits;
  const { isMonetary } = parseMonetaryQuery(options.query);
  const searchOptions = { ...options, isMonetarySearch: isMonetary };
  const records = await filterRecords(searchOptions);
  console.log("\u{1F4CA} filterRecords returned", records.length, "records");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const facets = await computeFacets(records);
  console.log("\u{1F3AF} computeFacets returned facets for keys:", Object.keys(facets));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const groupBy = options.selections?.groupBy?.values().next().value;
  const isGrouped = groupBy && groupBy !== "None";
  const fullGroups = await buildGroups(records, groupBy);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const limitedGroups = applyGroupLimits(fullGroups, groupLimits);
  const randomDelay = generateNormalRandom(meanDelay, variance);
  const effectiveDelay = Math.max(0, options.query.trim().length < 3 ? Math.min(randomDelay, 50) : randomDelay);
  await wait(effectiveDelay);
  return {
    query: options.query,
    totalResults: records.length,
    limitedGroups,
    fullGroups,
    facets,
    records,
    isGrouped: !!isGrouped
  };
}
async function getEntitySmartActions(entity, includeInferred = true) {
  await loadCorpus();
  if (!RELATIONSHIP_ENGINE) {
    console.warn("Relationship engine not available");
    return [];
  }
  try {
    return RELATIONSHIP_ENGINE.getSmartActions(entity, includeInferred);
  } catch (error) {
    console.warn("Error getting smart actions for", entity.id, ":", error);
    return [];
  }
}
async function getRelatedEntities(entityId, options) {
  await loadCorpus();
  if (!RELATIONSHIP_ENGINE) {
    console.warn("Relationship engine not available");
    return [];
  }
  try {
    return RELATIONSHIP_ENGINE.getRelatedEntities(entityId, {
      type: options?.type,
      confidence: options?.confidence,
      includeInferred: options?.includeInferred,
      limit: options?.limit
    });
  } catch (error) {
    console.warn("Error getting related entities for", entityId, ":", error);
    return [];
  }
}

// src/components/resultsView.ts
function sortRecordsByMostRecent(records) {
  return [...records].sort((a, b) => {
    const getMostRecentDate = (record) => {
      const updatedDate = new Date(record.updatedAt);
      let createdDate;
      if (isFinancialRecord(record)) {
        createdDate = new Date(record.issuedDate);
      } else {
        createdDate = new Date(record.createdAt);
      }
      return updatedDate > createdDate ? updatedDate : createdDate;
    };
    const dateA = getMostRecentDate(a);
    const dateB = getMostRecentDate(b);
    return dateB.getTime() - dateA.getTime();
  });
}
function sortRecordsByDueFirst(records) {
  return [...records].sort((a, b) => {
    const getDueDate = (record) => {
      if (isFinancialRecord(record) && record.dueDate) {
        return new Date(record.dueDate);
      }
      return new Date(record.updatedAt);
    };
    const dueDateA = getDueDate(a);
    const dueDateB = getDueDate(b);
    return dueDateA.getTime() - dueDateB.getTime();
  });
}
function sortRecordsByDueLast(records) {
  return [...records].sort((a, b) => {
    const getDueDate = (record) => {
      if (isFinancialRecord(record) && record.dueDate) {
        return new Date(record.dueDate);
      }
      return new Date(record.updatedAt);
    };
    const dueDateA = getDueDate(a);
    const dueDateB = getDueDate(b);
    return dueDateB.getTime() - dueDateA.getTime();
  });
}
function sortRecords(records, sortBy) {
  console.log("\u{1F504} Client-side sorting with sortBy:", sortBy, "for", records.length, "records");
  switch (sortBy) {
    case "mostRecent":
      return sortRecordsByMostRecent(records);
    case "dueFirst":
      return sortRecordsByDueFirst(records);
    case "dueLast":
      return sortRecordsByDueLast(records);
    case "relevance":
    default:
      return records;
  }
}
function getHighlightFunction2(query, isMonetarySearch) {
  if (isMonetarySearch) {
    return highlightMonetaryValuesWithPartialMatches;
  } else {
    return highlightText;
  }
}
var FACET_LABELS = {
  entityType: "Type",
  project: "Project",
  status: "Status",
  documentType: "Document Type",
  client: "Client",
  issuedDate: "Issued",
  totalValue: "Total",
  groupBy: "Group by",
  personType: "Person Type",
  contactOrganization: "Contact Organization",
  organizationType: "Organization Type",
  tradeFocus: "Trade Focus",
  costCodeCategory: "Cost Code Category",
  costCode: "Cost Code"
};
function createResultsView(options) {
  const container = document.createElement("section");
  container.className = "results-view";
  const header2 = document.createElement("header");
  header2.className = "results-view__header";
  header2.innerHTML = `
    <div>
      <h1>Search Results</h1>
      <p class="results-view__summary" id="results-summary"></p>
    </div>
    <div class="results-view__actions">
      <button type="button" class="clear-facets" hidden aria-label="Clear all active filters">Clear filters</button>
    </div>
  `;
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.className = "sr-only";
  liveRegion.id = "results-announcements";
  const mainContent = document.createElement("div");
  mainContent.className = "results-view__main";
  const facetsContainer = document.createElement("aside");
  facetsContainer.className = "results-view__facets";
  const resultsContainer = document.createElement("div");
  resultsContainer.className = "results-view__groups";
  mainContent.append(facetsContainer, resultsContainer);
  container.append(header2, liveRegion, mainContent);
  const summaryEl = header2.querySelector("#results-summary");
  const clearButton = header2.querySelector(".clear-facets");
  const announce = (message) => {
    liveRegion.textContent = message;
    setTimeout(() => {
      liveRegion.textContent = "";
    }, 1e3);
  };
  clearButton.addEventListener("click", () => {
    announce("All filters cleared");
    options.onClearFacets?.();
  });
  let previousContext = null;
  let lastWindowWidth = window.innerWidth;
  const handleResize = () => {
    const currentWidth = window.innerWidth;
    const wasMobile = lastWindowWidth <= 768;
    const isMobile = currentWidth <= 768;
    if (wasMobile !== isMobile && previousContext) {
      renderFacets(facetsContainer, previousContext.status, previousContext.response, previousContext.selections, options);
    }
    lastWindowWidth = currentWidth;
  };
  window.addEventListener("resize", handleResize);
  const render = (context) => {
    console.log("\u{1F3AF} ResultsView render called with context:", {
      status: context.status,
      hasResponse: !!context.response,
      hasFacets: !!context.response?.facets,
      query: context.query,
      selections: context.selections,
      sortBy: context.sortBy,
      isMonetarySearch: context.isMonetarySearch,
      errorMessage: context.errorMessage
    });
    const { response, selections, sortBy, status, query, errorMessage, isMonetarySearch } = context;
    const summaryChanged = !previousContext || previousContext.status !== status || previousContext.response !== response || previousContext.query !== query || previousContext.errorMessage !== errorMessage || previousContext.sortBy !== sortBy;
    if (summaryChanged) {
      console.log("\u{1F4DD} Rendering summary");
      renderSummary(summaryEl, status, response, query, errorMessage, sortBy, options.onSortByChange, announce);
    }
    const facetsChanged = !previousContext || previousContext.status !== status || previousContext.response !== response || previousContext.selections !== selections;
    if (facetsChanged) {
      console.log("\u{1F50D} Rendering facets");
      renderFacets(facetsContainer, status, response, selections, options, announce);
    }
    const resultsChanged = !previousContext || previousContext.status !== status || previousContext.response !== response || previousContext.query !== query || previousContext.errorMessage !== errorMessage || previousContext.isMonetarySearch !== isMonetarySearch || previousContext.sortBy !== sortBy;
    if (resultsChanged) {
      console.log("\u{1F4CA} Rendering results");
      const channel = new MessageChannel();
      channel.port2.onmessage = () => {
        renderGroups(resultsContainer, status, response, query, errorMessage, isMonetarySearch, sortBy);
      };
      channel.port1.postMessage(null);
    }
    const selectionsChanged = !previousContext || previousContext.selections !== selections;
    if (selectionsChanged) {
      const hasSelections = selections && Object.keys(selections).length > 0;
      clearButton.hidden = !hasSelections;
    }
    previousContext = context;
  };
  return {
    element: container,
    render
  };
}
function renderSummary(target, status, response, query, errorMessage, sortBy, onSortByChange, announce) {
  target.innerHTML = "";
  switch (status) {
    case "idle":
      if (isQueryTooShort(query)) {
        target.textContent = `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.`;
      } else {
        target.textContent = "Type a query to explore results and filters.";
      }
      return;
    case "loading":
      target.textContent = query ? `Searching for "${query}"\u2026` : "Searching\u2026";
      return;
    case "error":
      target.textContent = errorMessage ?? "Search failed. Try again.";
      return;
    case "ready":
      if (!response) {
        target.textContent = "No results.";
        return;
      }
      const resultText = response.totalResults === 1 ? "result" : "results";
      const shouldShowSort = response.totalResults > 1 && sortBy && onSortByChange;
      if (shouldShowSort) {
        const container = document.createElement("div");
        container.className = "results-summary-with-sort";
        const textSpan = document.createElement("span");
        textSpan.textContent = `${response.totalResults} ${resultText} for "${response.query}" sorted by `;
        const sortSelect = document.createElement("select");
        sortSelect.className = "results-summary__sort-select";
        const sortOptions = [
          { value: "relevance", label: "Relevance" },
          { value: "mostRecent", label: "Most recent" },
          { value: "dueFirst", label: "Due first" },
          { value: "dueLast", label: "Due last" }
        ];
        sortOptions.forEach((option) => {
          const optionElement = document.createElement("option");
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          sortSelect.appendChild(optionElement);
        });
        sortSelect.value = sortBy;
        sortSelect.addEventListener("change", () => {
          const newSort = sortSelect.value;
          console.log("\u{1F504} Sort By changed from", sortBy, "to", newSort);
          if (newSort !== sortBy) {
            const sortLabels = {
              relevance: "Relevance",
              mostRecent: "Most recent",
              dueFirst: "Due first",
              dueLast: "Due last"
            };
            if (announce) {
              announce(`Results sorted by ${sortLabels[newSort]}`);
            }
            console.log("\u{1F3AF} Calling onSortByChange for sortBy:", newSort);
            onSortByChange(newSort);
          }
        });
        container.append(textSpan, sortSelect);
        target.appendChild(container);
      } else {
        target.textContent = `${response.totalResults} ${resultText} for "${response.query}".`;
      }
      return;
    default:
      target.textContent = "";
  }
}
function renderFacets(container, status, response, selections, options, announce) {
  console.log("\u{1F50D} renderFacets called with:", {
    status,
    hasResponse: !!response,
    hasFacets: !!response?.facets,
    facetsCount: response?.facets ? Object.keys(response.facets).length : 0,
    selections,
    windowWidth: window.innerWidth
  });
  container.innerHTML = "";
  if (status === "idle") {
    console.log("\u{1F4F1} Status: idle - showing pro tips");
    container.classList.add("is-empty");
    container.innerHTML = renderFacetProTips("idle");
    return;
  }
  if (status === "loading") {
    console.log("\u23F3 Status: loading");
    container.classList.add("is-empty");
    container.textContent = "Calculating facets\u2026";
    return;
  }
  if (status === "error") {
    console.log("\u274C Status: error");
    container.classList.add("is-empty");
    container.textContent = "Facets unavailable while search is failing.";
    return;
  }
  if (!response || !response.facets) {
    console.log("\u{1F4ED} No response or facets - showing pro tips");
    container.classList.add("is-empty");
    container.innerHTML = renderFacetProTips("empty");
    return;
  }
  const facetsEntries = Object.entries(response.facets);
  console.log("\u{1F4CA} Facets entries:", facetsEntries.map(([key, values]) => ({ key, count: values.length })));
  if (facetsEntries.length === 0) {
    console.log("\u{1F4ED} No facets entries - showing pro tips");
    container.classList.add("is-empty");
    container.innerHTML = renderFacetProTips("no-results");
    return;
  }
  container.classList.remove("is-empty");
  const isMobile = window.innerWidth <= 768;
  console.log(`\u{1F4F1} Rendering ${isMobile ? "mobile" : "desktop"} facets`);
  if (isMobile) {
    renderMobileFacets(container, facetsEntries, selections, options, announce);
  } else {
    renderDesktopFacets(container, facetsEntries, selections, options, announce);
  }
  console.log("\u{1F50D} Container after rendering:", {
    innerHTML: container.innerHTML.substring(0, 500) + "...",
    childrenCount: container.children.length,
    classList: Array.from(container.classList),
    firstChild: container.firstChild,
    lastChild: container.lastChild,
    isVisible: container.offsetHeight > 0,
    computedStyle: window.getComputedStyle(container)
  });
}
function renderMobileFacets(container, facetsEntries, selections, options, announce) {
  console.log("\u{1F4F1} renderMobileFacets called with:", {
    facetsEntriesCount: facetsEntries.length,
    selections,
    hasOptions: !!options
  });
  const activeFiltersSummary = createActiveFiltersSummary(selections, options);
  console.log("\u2705 Created active filters summary:", activeFiltersSummary);
  container.append(activeFiltersSummary);
  const mobileFiltersSection = createMobileFiltersSection(facetsEntries, selections, options);
  console.log("\u2705 Created mobile filters section:", mobileFiltersSection);
  container.append(mobileFiltersSection);
  console.log("\u{1F50D} Container after appending mobile elements:", {
    childrenCount: container.children.length,
    firstChild: container.firstChild,
    lastChild: container.lastChild
  });
}
function renderDesktopFacets(container, facetsEntries, selections, options, announce) {
  const settings = settingsStore.getState();
  const maxFacetValues = settings.maxFacetValues;
  facetsEntries.forEach(([key, values]) => {
    const block = document.createElement("section");
    block.className = "results-view__facet-block";
    block.setAttribute("aria-labelledby", `facet-heading-${key}`);
    const heading = document.createElement("h3");
    heading.id = `facet-heading-${key}`;
    heading.textContent = FACET_LABELS[key] ?? key;
    block.append(heading);
    const list = document.createElement("ul");
    list.className = "results-view__facet-list";
    list.setAttribute("role", "group");
    list.setAttribute("aria-labelledby", `facet-heading-${key}`);
    const shouldLimit = maxFacetValues > 0 && values.length > maxFacetValues;
    const initialCount = shouldLimit ? maxFacetValues : values.length;
    const hiddenCount = values.length - initialCount;
    values.forEach((facet, index) => {
      const listItem = document.createElement("li");
      listItem.className = "results-view__facet-item";
      if (shouldLimit && index >= initialCount) {
        listItem.classList.add("facet-item--hidden");
      }
      const label = document.createElement("label");
      label.className = "facet-checkbox";
      label.htmlFor = `facet-${key}-${facet.value.replace(/\s+/g, "-").toLowerCase()}`;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "facet-checkbox__input";
      checkbox.dataset.key = key;
      checkbox.dataset.value = facet.value;
      checkbox.id = `facet-${key}-${facet.value.replace(/\s+/g, "-").toLowerCase()}`;
      const isSelected = selections[key]?.has(facet.value) ?? false;
      checkbox.checked = isSelected;
      const text = document.createElement("span");
      text.className = "facet-checkbox__text";
      if (key === "entityType") {
        text.textContent = formatEntityType(facet.value);
      } else {
        text.textContent = facet.value;
      }
      const count = document.createElement("span");
      count.className = "facet-checkbox__count";
      count.textContent = String(facet.count);
      label.append(checkbox, text, count);
      listItem.append(label);
      list.append(listItem);
      checkbox.addEventListener("change", () => {
        const isSelected2 = checkbox.checked;
        const facetLabel = FACET_LABELS[key] ?? key;
        const valueLabel = key === "entityType" ? formatEntityType(facet.value) : facet.value;
        if (announce) {
          announce(`${isSelected2 ? "Selected" : "Deselected"} filter: ${facetLabel} - ${valueLabel}`);
        }
        options.onFacetToggle(key, facet.value);
      });
    });
    block.append(list);
    if (shouldLimit && hiddenCount > 0) {
      const toggleContainer = document.createElement("div");
      toggleContainer.className = "facet-toggle-container";
      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "facet-toggle-button";
      toggleButton.textContent = `Show ${hiddenCount} more${hiddenCount === 1 ? "" : "..."}`;
      toggleButton.dataset.facetKey = key;
      toggleContainer.append(toggleButton);
      block.append(toggleContainer);
      toggleButton.addEventListener("click", () => {
        const isExpanded = toggleButton.classList.contains("is-expanded");
        const allItems = list.querySelectorAll(".results-view__facet-item");
        if (isExpanded) {
          allItems.forEach((item, index) => {
            if (index >= initialCount) {
              item.classList.add("facet-item--hidden");
            }
          });
          toggleButton.textContent = `Show ${hiddenCount} more${hiddenCount === 1 ? "" : "..."}`;
          toggleButton.classList.remove("is-expanded");
        } else {
          allItems.forEach((item) => item.classList.remove("facet-item--hidden"));
          toggleButton.textContent = "Show less";
          toggleButton.classList.add("is-expanded");
        }
      });
    }
    container.append(block);
  });
}
function createActiveFiltersSummary(selections, options) {
  console.log("\u{1F3F7}\uFE0F createActiveFiltersSummary called with:", {
    selections,
    hasOptions: !!options,
    hasOnFacetToggle: !!options?.onFacetToggle
  });
  const summary = document.createElement("div");
  summary.className = "active-filters-summary";
  const activeFilters = [];
  Object.entries(selections).forEach(([key, values]) => {
    console.log(`\u{1F50D} Processing facet key "${key}":`, { values, hasValues: !!values, size: values?.size });
    if (values && values.size > 0) {
      values.forEach((value) => {
        console.log(`  \u{1F4DD} Processing value "${value}" for key "${key}"`);
        const label2 = key === "entityType" ? formatEntityType(value) : value;
        const facetLabel = FACET_LABELS[key] ?? key;
        const fullLabel = `${facetLabel}: ${label2}`;
        console.log(`  \u2705 Created label: "${fullLabel}"`);
        activeFilters.push({
          key,
          value,
          label: fullLabel
        });
      });
    }
  });
  console.log("\u{1F4CA} Total active filters:", activeFilters.length, activeFilters);
  if (activeFilters.length === 0) {
    console.log("\u{1F4ED} No active filters - hiding summary");
    summary.classList.add("hidden");
    return summary;
  }
  const label = document.createElement("span");
  label.className = "active-filters-label";
  label.textContent = "Active filters:";
  summary.append(label);
  activeFilters.forEach((filter, index) => {
    console.log(`\u{1F3F7}\uFE0F Creating pill ${index + 1}:`, filter);
    const pill = document.createElement("div");
    pill.className = "filter-pill";
    const text = document.createElement("span");
    text.textContent = filter.label;
    const removeButton = document.createElement("button");
    removeButton.className = "filter-pill-remove";
    removeButton.innerHTML = "\xD7";
    removeButton.addEventListener("click", () => {
      console.log("\u{1F5D1}\uFE0F Removing filter:", filter);
      if (options.onFacetToggle) {
        options.onFacetToggle(filter.key, filter.value);
      } else {
        console.error("\u274C options.onFacetToggle is undefined!");
      }
    });
    pill.append(text, removeButton);
    summary.append(pill);
  });
  console.log("\u2705 Active filters summary created:", summary);
  return summary;
}
function createMobileFiltersSection(facetsEntries, selections, options) {
  console.log("\u{1F4F1} createMobileFiltersSection called with:", {
    facetsEntriesCount: facetsEntries.length,
    selections,
    hasOptions: !!options
  });
  const section = document.createElement("div");
  section.className = "mobile-filters-section";
  const activeFilterCount = Object.values(selections).reduce((count2, values) => {
    return count2 + (values ? values.size : 0);
  }, 0);
  console.log("\u{1F4CA} Active filter count:", activeFilterCount);
  const header2 = document.createElement("div");
  header2.className = "mobile-filters-header";
  const title = document.createElement("div");
  title.className = "mobile-filters-title";
  title.innerHTML = "\u{1F50D} Filters";
  const count = document.createElement("span");
  count.className = "mobile-filters-count";
  count.textContent = String(activeFilterCount);
  title.append(count);
  const toggle = document.createElement("button");
  toggle.className = "mobile-filters-toggle";
  toggle.innerHTML = "\u25BC";
  header2.append(title, toggle);
  section.append(header2);
  const content = document.createElement("div");
  content.className = "mobile-filters-content";
  console.log("\u{1F4CB} Creating facet categories...");
  facetsEntries.forEach(([key, values], index) => {
    console.log(`  \u{1F4C1} Creating category ${index + 1}: ${key} with ${values.length} values`);
    const category = createMobileFacetCategory(key, values, selections, options);
    content.append(category);
  });
  section.append(content);
  header2.addEventListener("click", () => {
    console.log("\u{1F504} Toggling mobile filters section");
    content.classList.toggle("expanded");
    toggle.classList.toggle("expanded");
  });
  console.log("\u2705 Mobile filters section created:", section);
  return section;
}
function createMobileFacetCategory(key, values, selections, options) {
  console.log(`\u{1F4C1} createMobileFacetCategory called for "${key}" with ${values.length} values`);
  try {
    const category = document.createElement("div");
    category.className = "mobile-facet-category";
    const header2 = document.createElement("div");
    header2.className = "mobile-facet-category-header";
    const title = document.createElement("span");
    title.className = "mobile-facet-category-title";
    const facetLabel = FACET_LABELS[key] ?? key;
    console.log(`  \u{1F3F7}\uFE0F Using facet label: "${facetLabel}" for key "${key}"`);
    title.textContent = facetLabel;
    const count = document.createElement("span");
    count.className = "mobile-facet-category-count";
    count.textContent = String(values.length);
    const toggle = document.createElement("button");
    toggle.className = "mobile-facet-category-toggle";
    toggle.innerHTML = "\u25BC";
    header2.append(count, title, toggle);
    category.append(header2);
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "mobile-facet-options";
    console.log(`  \u{1F4CB} Creating ${values.length} options for category "${key}"`);
    values.forEach((facet, index) => {
      console.log(`    \u{1F4DD} Creating option ${index + 1}: "${facet.value}" (count: ${facet.count})`);
      try {
        const option = createMobileFacetOption(key, facet, selections, options);
        optionsContainer.append(option);
      } catch (error) {
        console.error(`    \u274C Error creating option ${index + 1}:`, error);
      }
    });
    category.append(optionsContainer);
    header2.addEventListener("click", () => {
      console.log(`\u{1F504} Toggling category "${key}"`);
      optionsContainer.classList.toggle("expanded");
      toggle.classList.toggle("expanded");
    });
    console.log(`\u2705 Created category "${key}" successfully:`, category);
    return category;
  } catch (error) {
    console.error(`\u274C Error creating category "${key}":`, error);
    const fallback = document.createElement("div");
    fallback.className = "mobile-facet-category";
    fallback.textContent = `Error loading ${key}`;
    return fallback;
  }
}
function createMobileFacetOption(key, facet, selections, options) {
  console.log(`    \u{1F4DD} createMobileFacetOption called for "${key}" value "${facet.value}"`);
  try {
    const option = document.createElement("div");
    option.className = "mobile-facet-option";
    const checkbox = document.createElement("div");
    checkbox.className = "mobile-facet-checkbox";
    const isSelected = selections[key]?.has(facet.value) ?? false;
    console.log(`      \u2705 Is selected: ${isSelected}`);
    if (isSelected) {
      checkbox.classList.add("checked");
      checkbox.innerHTML = "\u2713";
    }
    const content = document.createElement("div");
    content.className = "mobile-facet-option-content";
    const label = document.createElement("span");
    label.className = "mobile-facet-option-label";
    let labelText;
    if (key === "entityType") {
      console.log(`      \u{1F504} Formatting entity type: "${facet.value}"`);
      labelText = formatEntityType(facet.value);
      console.log(`      \u2705 Formatted entity type: "${labelText}"`);
    } else {
      labelText = facet.value;
    }
    label.textContent = labelText;
    const count = document.createElement("span");
    count.className = "mobile-facet-option-count";
    count.textContent = String(facet.count);
    content.append(count, label);
    option.append(checkbox, content);
    option.addEventListener("click", () => {
      console.log(`      \u{1F5B1}\uFE0F Clicked option: "${facet.value}" for key "${key}"`);
      const isSelected2 = selections[key]?.has(facet.value) ?? false;
      if (options.onFacetToggle) {
        options.onFacetToggle(key, facet.value);
      } else {
        console.error("      \u274C options.onFacetToggle is undefined!");
      }
      if (isSelected2) {
        checkbox.classList.remove("checked");
        checkbox.innerHTML = "";
      } else {
        checkbox.classList.add("checked");
        checkbox.innerHTML = "\u2713";
      }
    });
    console.log(`      \u2705 Created option successfully:`, option);
    return option;
  } catch (error) {
    console.error(`      \u274C Error creating option:`, error);
    const fallback = document.createElement("div");
    fallback.className = "mobile-facet-option";
    fallback.textContent = `Error: ${facet.value}`;
    return fallback;
  }
}
function renderGroups(container, status, response, query, errorMessage, isMonetarySearch, sortBy) {
  const fragment = document.createDocumentFragment();
  container.innerHTML = "";
  if (status === "idle") {
    if (isQueryTooShort(query)) {
      const message = `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see matching records.`;
      const proTipsElement = document.createElement("div");
      proTipsElement.innerHTML = renderProTipsState(message, "idle");
      fragment.appendChild(proTipsElement);
      const facetsContainer2 = container.closest(".results-view__main")?.querySelector(".results-view__facets");
      if (facetsContainer2) {
        facetsContainer2.style.display = "none";
      }
    } else {
      const proTipsElement = document.createElement("div");
      proTipsElement.innerHTML = renderProTipsState("", "empty");
      fragment.appendChild(proTipsElement);
      const facetsContainer2 = container.closest(".results-view__main")?.querySelector(".results-view__facets");
      if (facetsContainer2) {
        facetsContainer2.style.display = "none";
      }
    }
    container.appendChild(fragment);
    return;
  }
  if (status === "loading") {
    const loadingElement = document.createElement("p");
    loadingElement.className = "results-view__empty";
    loadingElement.textContent = "Fetching results\u2026";
    fragment.appendChild(loadingElement);
    container.appendChild(fragment);
    return;
  }
  if (status === "error") {
    const errorElement = document.createElement("p");
    errorElement.className = "results-view__empty";
    errorElement.textContent = errorMessage ?? "Something went wrong while searching.";
    fragment.appendChild(errorElement);
    container.appendChild(fragment);
    return;
  }
  if (!response || !response.fullGroups.length) {
    const proTipsElement = document.createElement("div");
    proTipsElement.innerHTML = renderProTipsState("No results found", "no-results", query);
    fragment.appendChild(proTipsElement);
    const facetsContainer2 = container.closest(".results-view__main")?.querySelector(".results-view__facets");
    if (facetsContainer2) {
      facetsContainer2.style.display = "none";
    }
    container.appendChild(fragment);
    return;
  }
  const facetsContainer = container.closest(".results-view__main")?.querySelector(".results-view__facets");
  if (facetsContainer) {
    facetsContainer.style.display = "";
  }
  let sortedResponse = response;
  if (sortBy && sortBy !== "relevance") {
    console.log("\u{1F504} Applying client-side sorting:", sortBy);
    const sortedRecords = sortRecords(response.records, sortBy);
    sortedResponse = {
      ...response,
      records: sortedRecords,
      // Also sort the groups if they exist
      fullGroups: response.fullGroups.map((group) => ({
        ...group,
        items: sortRecords(group.items, sortBy)
      })),
      limitedGroups: response.limitedGroups.map((group) => ({
        ...group,
        items: sortRecords(group.items, sortBy)
      }))
    };
  }
  if (sortedResponse.isGrouped) {
    const batchSize = 5;
    let currentIndex = 0;
    const renderBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, sortedResponse.fullGroups.length);
      for (let i = currentIndex; i < endIndex; i++) {
        const group = sortedResponse.fullGroups[i];
        fragment.appendChild(renderGroup2(group, group.groupTitle, query, isMonetarySearch));
      }
      currentIndex = endIndex;
      if (currentIndex < sortedResponse.fullGroups.length) {
        setTimeout(renderBatch, 0);
      } else {
        container.appendChild(fragment);
      }
    };
    renderBatch();
  } else {
    const flatList = document.createElement("div");
    flatList.className = "results-list";
    const batchSize = 10;
    let currentIndex = 0;
    const renderBatch = () => {
      const endIndex = Math.min(currentIndex + batchSize, sortedResponse.records.length);
      const batch = sortedResponse.records.slice(currentIndex, endIndex);
      batch.forEach((record) => {
        const card = renderResultCardSync(record, query, isMonetarySearch);
        flatList.append(card);
      });
      currentIndex = endIndex;
      if (currentIndex < sortedResponse.records.length) {
        setTimeout(renderBatch, 0);
      } else {
        fragment.appendChild(flatList);
        container.appendChild(fragment);
      }
    };
    renderBatch();
  }
}
function renderGroup2(group, groupTitle, query, isMonetarySearch) {
  const section = document.createElement("section");
  section.className = "results-group";
  const heading = document.createElement("header");
  heading.className = "results-group__header";
  const title = groupTitle || formatEntityType(group.entityType, { plural: true });
  heading.innerHTML = `
    <h2>${title}</h2>
    <span class="results-group__count">${group.items.length}</span>
  `;
  const list = document.createElement("div");
  list.className = "results-group__list";
  group.items.forEach((item) => {
    const card = renderResultCardSync(item, query, isMonetarySearch);
    list.append(card);
  });
  section.append(heading, list);
  return section;
}
function renderResultCardSync(item, query, isMonetarySearch) {
  const card = document.createElement("article");
  card.setAttribute("data-document-id", item.id);
  if (isBuildertrendRecord(item)) {
    card.className = "result-card result-card--buildertrend";
    card.setAttribute("data-url", item.url);
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Navigate to ${item.title} - ${item.path || item.description || "Buildertrend record"}`);
    card.addEventListener("click", () => {
      console.log("Navigate to:", item.url);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        console.log("Navigate to:", item.url);
      }
    });
  } else {
    card.className = "result-card";
    card.setAttribute("role", "article");
  }
  const header2 = document.createElement("div");
  header2.className = "result-card__header";
  const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
  const title = document.createElement("h3");
  title.innerHTML = query && highlightFn ? highlightFn(item.title, query) : item.title;
  if (isBuildertrendRecord(item)) {
    const icon = document.createElement("i");
    icon.className = "result-card__icon";
    icon.setAttribute("data-lucide", item.icon);
    header2.append(icon, title);
    setTimeout(() => {
      if (window.lucide) {
        try {
          window.lucide.createIcons();
        } catch (error) {
          console.warn("Error updating icons:", error);
        }
      }
    }, 0);
  } else {
    header2.append(title);
  }
  const badge = document.createElement("span");
  badge.className = "result-card__badge";
  badge.textContent = formatEntityType(item.entityType);
  header2.append(badge);
  const summary = document.createElement("p");
  summary.className = "result-card__summary";
  summary.innerHTML = query && highlightFn ? highlightFn(item.summary, query) : item.summary;
  const metaList = document.createElement("ul");
  metaList.className = "result-card__meta";
  metaList.append(...buildMetaItems(item, query, isMonetarySearch));
  card.append(header2, summary, metaList);
  if (query) {
    const match = findBestMatch(item, query);
    if (match && match.field !== "title" && match.field !== "summary" && !match.field.startsWith("lineItem")) {
      const context = document.createElement("div");
      context.className = "search-context";
      const highlightedSnippet = isMonetarySearch ? highlightMonetaryValuesWithPartialMatches(match.content, query) : getContextSnippet(match, 120, query);
      context.innerHTML = `<strong>Matched in ${getFieldLabel(match.field)}:</strong> ${highlightedSnippet}`;
      card.append(context);
    }
  }
  if (isFinancialRecord(item)) {
    const lineItemsBlock = renderLineItems(item, query, isMonetarySearch);
    if (lineItemsBlock) {
      card.append(lineItemsBlock);
    }
  }
  if (isDailyLogRecord(item)) {
    const dailyLogContent = renderDailyLogContent(item, query, highlightFn);
    if (dailyLogContent) {
      card.append(dailyLogContent);
    }
  }
  setTimeout(async () => {
    const settings = settingsStore.getState();
    const includeInferred = settings.showInferredRelationships ?? true;
    try {
      const relatedEntities = await getRelatedEntities(item.id, {
        includeInferred,
        limit: 3
      });
      const smartActions = await getEntitySmartActions(item, includeInferred);
      if (relatedEntities.length > 0) {
        const relatedSection = renderRelatedItems(relatedEntities, item.id);
        card.append(relatedSection);
      }
      if (smartActions.length > 0) {
        const actionsSection = renderSmartActions(smartActions, item);
        card.append(actionsSection);
      }
    } catch (error) {
      console.warn("Error loading relationships for", item.id, ":", error);
    }
  }, 0);
  return card;
}
function buildMetaItems(item, query, isMonetarySearch) {
  const metas = [];
  const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
  const highlightValue = (value) => highlightFn ? highlightFn(value, query) : value;
  const pushMeta = (label, value) => {
    if (!value) {
      return;
    }
    const entry = document.createElement("li");
    entry.innerHTML = `<span>${label}</span><strong>${highlightValue(value)}</strong>`;
    metas.push(entry);
  };
  if (isBuildertrendRecord(item)) {
    pushMeta("Navigate To", item.path);
    pushMeta("Description", item.description);
    return metas;
  }
  pushMeta("Project", item.project);
  pushMeta("Status", item.status);
  if (item.entityType === "Document") {
    const doc = item;
    pushMeta("Type", doc.documentType);
    pushMeta("Updated", formatDate(item.updatedAt));
    return metas;
  }
  if (isFinancialRecord(item)) {
    pushMeta("Issued", formatDate(item.issuedDate));
    if (item.dueDate) {
      pushMeta("Due", formatDate(item.dueDate));
    }
    pushMeta("Total", formatCurrency(item.totalValue));
    return metas;
  }
  if (isPersonRecord(item)) {
    pushMeta("Person Type", item.personType);
    pushMeta("Role", item.jobTitle);
    pushMeta("Organization", item.associatedOrganization);
    pushMeta("Location", item.location);
    pushMeta("Email", item.email);
    pushMeta("Phone", item.phone);
    if (item.tradeFocus) {
      pushMeta("Trade Focus", item.tradeFocus);
    }
    return metas;
  }
  if (isOrganizationRecord(item)) {
    pushMeta("Business Type", item.organizationType);
    pushMeta("Trade", item.tradeFocus);
    pushMeta("Service Area", item.serviceArea);
    pushMeta("Primary Contact", item.primaryContact);
    pushMeta("Phone", item.phone);
    pushMeta("Email", item.email);
    if (item.website) {
      pushMeta("Website", item.website);
    }
    return metas;
  }
  return metas;
}
function hasLineItemMatches(item, query, isMonetarySearch) {
  if (!query || !isFinancialRecord(item)) return false;
  const items = item.lineItems ?? [];
  if (items.length === 0) return false;
  const highlightFn = getHighlightFunction2(query, isMonetarySearch || false);
  return items.some((lineItem) => {
    let searchableFields = [];
    if (isMonetarySearch) {
      const monetaryFields = [];
      monetaryFields.push(formatCurrency(lineItem.lineItemUnitPrice));
      monetaryFields.push(formatCurrency(lineItem.lineItemTotal));
      searchableFields = monetaryFields.filter((field) => field && field.trim() !== "");
    } else {
      searchableFields = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType,
        lineItem.lineItemQuantity?.toString() || "",
        lineItem.lineItemQuantityUnitOfMeasure,
        formatCurrency(lineItem.lineItemUnitPrice),
        formatCurrency(lineItem.lineItemTotal),
        // Add cost code fields for matching
        lineItem.costCode,
        lineItem.costCodeName,
        lineItem.costCodeCategory,
        lineItem.costCodeCategoryName
      ].filter((field) => field != null && field.trim() !== "");
    }
    return searchableFields.some((value) => {
      if (!value) return false;
      const highlighted = highlightFn(value, query);
      return highlighted.includes("<mark");
    });
  });
}
function getMatchingLineItemIndices(item, query, isMonetarySearch) {
  if (!query || !isFinancialRecord(item)) return [];
  const items = item.lineItems ?? [];
  if (items.length === 0) return [];
  const matchingIndices = [];
  const highlightFn = getHighlightFunction2(query, isMonetarySearch || false);
  items.forEach((lineItem, index) => {
    let searchableFields = [];
    if (isMonetarySearch) {
      const monetaryFields = [];
      monetaryFields.push(formatCurrency(lineItem.lineItemUnitPrice));
      monetaryFields.push(formatCurrency(lineItem.lineItemTotal));
      searchableFields = monetaryFields.filter((field) => field && field.trim() !== "");
    } else {
      searchableFields = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType,
        lineItem.lineItemQuantity?.toString() || "",
        lineItem.lineItemQuantityUnitOfMeasure,
        formatCurrency(lineItem.lineItemUnitPrice),
        formatCurrency(lineItem.lineItemTotal),
        // Add cost code fields for matching
        lineItem.costCode,
        lineItem.costCodeName,
        lineItem.costCodeCategory,
        lineItem.costCodeCategoryName
      ].filter((field) => field != null && field.trim() !== "");
    }
    const hasMatch = searchableFields.some((value) => {
      if (!value) return false;
      const highlighted = highlightFn(value, query);
      return highlighted.includes("<mark");
    });
    if (hasMatch) {
      matchingIndices.push(index);
    }
  });
  return matchingIndices;
}
function groupMatchingLineItems(matchingIndices, collapseThreshold) {
  if (matchingIndices.length === 0) return [];
  const groups = [];
  let currentGroup = {
    startIndex: matchingIndices[0],
    endIndex: matchingIndices[0],
    indices: [matchingIndices[0]]
  };
  for (let i = 1; i < matchingIndices.length; i++) {
    const currentIndex = matchingIndices[i];
    const lastIndex = matchingIndices[i - 1];
    if (currentIndex - lastIndex <= collapseThreshold) {
      currentGroup.endIndex = currentIndex;
      currentGroup.indices.push(currentIndex);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        startIndex: currentIndex,
        endIndex: currentIndex,
        indices: [currentIndex]
      };
    }
  }
  groups.push(currentGroup);
  return groups;
}
function calculateDisplayRanges(groups, contextCount, totalItems) {
  if (groups.length === 0) return [];
  const ranges = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const start = Math.max(0, group.startIndex - contextCount);
    const end = Math.min(totalItems - 1, group.endIndex + contextCount);
    ranges.push({ start, end });
    if (i < groups.length - 1) {
      const nextGroup = groups[i + 1];
      const gapStart = end + 1;
      const gapEnd = Math.max(0, nextGroup.startIndex - contextCount) - 1;
      if (gapStart <= gapEnd) {
        ranges.push({ start: gapStart, end: gapEnd, isCollapsed: true });
      }
    }
  }
  return ranges;
}
function getContextCountFromBehavior(behavior) {
  switch (behavior) {
    case "show-matched-only":
      return 0;
    case "show-matched-with-context-1":
      return 1;
    case "show-matched-with-context-2":
      return 2;
    case "show-matched-with-context-3":
      return 3;
    case "show-matched-with-context-5":
      return 5;
    case "show-all-always":
    case "hide-all-always":
      return 0;
    // Not used for these behaviors
    default:
      return 3;
  }
}
function renderLineItems(item, query, isMonetarySearch) {
  if (!isFinancialRecord(item)) {
    return null;
  }
  const items = item.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }
  const settings = settingsStore.getState();
  const hasMatches = hasLineItemMatches(item, query, isMonetarySearch);
  const behavior = settings.lineItemBehavior;
  const shouldShowLineItems = behavior !== "hide-all-always";
  const shouldShowAllItems = behavior === "show-all-always";
  const contextCount = getContextCountFromBehavior(behavior);
  const wrapper = document.createElement("div");
  wrapper.className = "result-card__line-items";
  const groupLineItemsByCostCode = (items2) => {
    const groups = {};
    items2.forEach((item2) => {
      const categoryId = item2.costCodeCategory || "buildertrend-default";
      const categoryName = item2.costCodeCategoryName || "Buildertrend Default";
      if (!groups[categoryId]) {
        groups[categoryId] = { categoryName, items: [] };
      }
      groups[categoryId].items.push(item2);
    });
    return groups;
  };
  const renderLineItemRow = (line, index) => {
    const row = document.createElement("tr");
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
    const costCodeDisplay = line.costCodeName || line.costCode || "";
    const shouldHighlightDescription = query && highlightFn && !isMonetarySearch;
    const shouldHighlightCostCode = query && highlightFn && !isMonetarySearch;
    const shouldHighlightType = query && highlightFn && !isMonetarySearch;
    const shouldHighlightQuantity = query && highlightFn && !isMonetarySearch;
    const shouldHighlightUnitPrice = query && highlightFn;
    const shouldHighlightTotal = query && highlightFn;
    row.innerHTML = `
      <td class="line-item__description">${shouldHighlightDescription ? highlightFn(line.lineItemTitle, query) : line.lineItemTitle}</td>
      ${costCodeDisplay ? `<td class="line-item__cost-code">${shouldHighlightCostCode ? highlightFn(costCodeDisplay, query) : costCodeDisplay}</td>` : ""}
      <td class="line-item__type">${shouldHighlightType ? highlightFn(line.lineItemType, query) : line.lineItemType}</td>
      <td class="line-item__quantity">${shouldHighlightQuantity ? highlightFn(quantity, query) : quantity}</td>
      <td class="line-item__unit-price">${shouldHighlightUnitPrice ? highlightFn(unitPrice, query) : unitPrice}</td>
      <td class="line-item__total">${shouldHighlightTotal ? highlightFn(total, query) : total}</td>
    `;
    return row;
  };
  const renderTableContent = (container, forceShowAll = false) => {
    const targetContainer = container || wrapper;
    const existingTable = targetContainer.querySelector(".line-items-table");
    if (existingTable) {
      existingTable.remove();
    }
    const table = document.createElement("table");
    table.className = "line-items-table";
    const hasCostCodes = items.some((item2) => item2.costCode || item2.costCodeName);
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>Description</th>
      ${hasCostCodes ? "<th>Cost Code</th>" : ""}
      <th>Type</th>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Total</th>
    `;
    thead.append(headerRow);
    table.append(thead);
    const tbody = document.createElement("tbody");
    if (hasCostCodes) {
      const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
      let itemsToShow = [];
      if (forceShowAll || shouldShowAllItems) {
        itemsToShow = items;
      } else if (behavior === "hide-all-always") {
        itemsToShow = [];
      } else if (hasMatches && (behavior === "show-matched-only" || behavior.startsWith("show-matched-with-context"))) {
        const matchingIndices = getMatchingLineItemIndices(item, query, isMonetarySearch);
        if (matchingIndices.length > 0) {
          if (settings.collapseIrrelevantLineItems && matchingIndices.length > 1) {
            const groups2 = groupMatchingLineItems(matchingIndices, settings.lineItemsCollapseThreshold);
            const displayRanges = calculateDisplayRanges(groups2, contextCount, items.length);
            displayRanges.forEach((range) => {
              if (!range.isCollapsed) {
                for (let i = range.start; i <= range.end; i++) {
                  itemsToShow.push(items[i]);
                }
              }
            });
          } else {
            const minIndex = Math.min(...matchingIndices);
            const maxIndex = Math.max(...matchingIndices);
            const startIndex = Math.max(0, minIndex - contextCount);
            const endIndex = Math.min(items.length, maxIndex + contextCount + 1);
            itemsToShow = items.slice(startIndex, endIndex);
          }
        } else {
          itemsToShow = [];
        }
      } else {
        itemsToShow = items;
      }
      const groups = groupLineItemsByCostCode(itemsToShow);
      const sortedCategories = Object.keys(groups).sort((a, b) => {
        const getNumericOrder = (categoryId) => {
          if (categoryId === "buildertrend-default") return 9999;
          const match = categoryId.match(/(\d+)/);
          return match ? parseInt(match[1]) : 9999;
        };
        return getNumericOrder(a) - getNumericOrder(b);
      });
      sortedCategories.forEach((categoryId) => {
        const group = groups[categoryId];
        const categoryRow = document.createElement("tr");
        categoryRow.className = "line-item__category-header";
        const colspan = hasCostCodes ? 6 : 5;
        categoryRow.innerHTML = `<td colspan="${colspan}" class="line-item__category-title">${group.categoryName}</td>`;
        tbody.append(categoryRow);
        group.items.forEach((item2, index) => {
          const row = renderLineItemRow(item2, index);
          tbody.append(row);
        });
      });
      if (itemsToShow.length < items.length) {
        const showAllRow = document.createElement("tr");
        showAllRow.className = "line-item__show-all";
        const colspan = hasCostCodes ? 6 : 5;
        showAllRow.innerHTML = `
          <td colspan="${colspan}" class="line-item__show-all-content">
            <button type="button" class="line-item__show-all-button">
              Show all ${items.length} item${items.length === 1 ? "" : "s"}
            </button>
          </td>
        `;
        tbody.append(showAllRow);
        const showAllButton = showAllRow.querySelector(".line-item__show-all-button");
        showAllButton.addEventListener("click", () => {
          renderTableContent(targetContainer, true);
        });
      }
    } else {
      const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
      let displayRanges = [];
      let hiddenItems = [];
      if (forceShowAll || shouldShowAllItems) {
        displayRanges = [{ start: 0, end: items.length - 1 }];
        hiddenItems = [];
      } else if (behavior === "hide-all-always") {
        displayRanges = [];
        hiddenItems = items;
      } else if (hasMatches && (behavior === "show-matched-only" || behavior.startsWith("show-matched-with-context"))) {
        const matchingIndices = getMatchingLineItemIndices(item, query, isMonetarySearch);
        if (matchingIndices.length > 0) {
          if (settings.collapseIrrelevantLineItems && matchingIndices.length > 1) {
            const groups = groupMatchingLineItems(matchingIndices, settings.lineItemsCollapseThreshold);
            displayRanges = calculateDisplayRanges(groups, contextCount, items.length);
            hiddenItems = [];
            displayRanges.forEach((range) => {
              if (range.isCollapsed) {
                for (let i = range.start; i <= range.end; i++) {
                  hiddenItems.push(items[i]);
                }
              }
            });
          } else {
            const minIndex = Math.min(...matchingIndices);
            const maxIndex = Math.max(...matchingIndices);
            const startIndex = Math.max(0, minIndex - contextCount);
            const endIndex = Math.min(items.length, maxIndex + contextCount + 1);
            displayRanges = [{ start: startIndex, end: endIndex - 1 }];
            hiddenItems = [
              ...items.slice(0, startIndex),
              ...items.slice(endIndex)
            ];
          }
        } else {
          displayRanges = [];
          hiddenItems = items;
        }
      } else {
        displayRanges = [{ start: 0, end: items.length - 1 }];
        hiddenItems = [];
      }
      const collapsedRows = [];
      const collapsedContent = [];
      displayRanges.forEach((range) => {
        if (range.isCollapsed) {
          const collapsedRow = document.createElement("tr");
          collapsedRow.className = "line-item__collapsed";
          const itemCount = range.end - range.start + 1;
          const colspan = hasCostCodes ? 6 : 5;
          collapsedRow.innerHTML = `
            <td colspan="${colspan}" class="line-item__collapsed-content">
              <span class="line-item__collapsed-text">...</span>
              <span class="line-item__collapsed-count">${itemCount} item${itemCount === 1 ? "" : "s"}</span>
            </td>
          `;
          tbody.append(collapsedRow);
          collapsedRows.push(collapsedRow);
          const contentRows = [];
          for (let i = range.start; i <= range.end; i++) {
            const lineItemRow = renderLineItemRow(items[i], i);
            lineItemRow.style.display = "none";
            tbody.append(lineItemRow);
            contentRows.push(lineItemRow);
          }
          collapsedContent.push(contentRows);
          collapsedRow.addEventListener("click", () => {
            const isExpanded = contentRows[0].style.display !== "none";
            if (isExpanded) {
              contentRows.forEach((row) => row.style.display = "none");
              collapsedRow.innerHTML = `
                <td colspan="${colspan}" class="line-item__collapsed-content">
                  <span class="line-item__collapsed-text">...</span>
                  <span class="line-item__collapsed-count">${itemCount} item${itemCount === 1 ? "" : "s"}</span>
                </td>
              `;
            } else {
              contentRows.forEach((row) => row.style.display = "");
              collapsedRow.innerHTML = `
                <td colspan="${colspan}" class="line-item__collapsed-content">
                  <span class="line-item__collapsed-text">\u2191</span>
                  <span class="line-item__collapsed-count">Hide ${itemCount} item${itemCount === 1 ? "" : "s"}</span>
                </td>
              `;
            }
          });
        } else {
          for (let i = range.start; i <= range.end; i++) {
            const row = renderLineItemRow(items[i], i);
            tbody.append(row);
          }
        }
      });
      if (hiddenItems.length > 0) {
        const showAllRow = document.createElement("tr");
        showAllRow.className = "line-item__show-all";
        const colspan = hasCostCodes ? 6 : 5;
        showAllRow.innerHTML = `
          <td colspan="${colspan}" class="line-item__show-all-content">
            <button type="button" class="line-item__show-all-button">
              Show all ${items.length} item${items.length === 1 ? "" : "s"}
            </button>
          </td>
        `;
        tbody.append(showAllRow);
        const showAllButton = showAllRow.querySelector(".line-item__show-all-button");
        showAllButton.addEventListener("click", () => {
          renderTableContent(targetContainer, true);
        });
      }
    }
    table.append(tbody);
    targetContainer.append(table);
  };
  if (behavior === "hide-all-always") {
    const toggleLink = document.createElement("button");
    toggleLink.className = "line-items-toggle";
    toggleLink.textContent = `Show line item${items.length === 1 ? "" : "s"} (${items.length})`;
    toggleLink.type = "button";
    const tableContainer = document.createElement("div");
    tableContainer.style.display = "none";
    toggleLink.addEventListener("click", () => {
      if (tableContainer.style.display === "none") {
        tableContainer.style.display = "block";
        toggleLink.textContent = `Hide line item${items.length === 1 ? "" : "s"}`;
        if (!tableContainer.querySelector(".line-items-table")) {
          renderTableContent(tableContainer);
        }
      } else {
        tableContainer.style.display = "none";
        toggleLink.textContent = `Show line item${items.length === 1 ? "" : "s"} (${items.length})`;
      }
    });
    wrapper.append(toggleLink, tableContainer);
    return wrapper;
  }
  if ((behavior === "show-matched-only" || behavior.startsWith("show-matched-with-context")) && !hasMatches) {
    const toggleLink = document.createElement("button");
    toggleLink.className = "line-items-toggle";
    toggleLink.textContent = `Show line item${items.length === 1 ? "" : "s"} (${items.length})`;
    toggleLink.type = "button";
    const tableContainer = document.createElement("div");
    tableContainer.style.display = "none";
    toggleLink.addEventListener("click", () => {
      if (tableContainer.style.display === "none") {
        tableContainer.style.display = "block";
        toggleLink.textContent = `Hide line item${items.length === 1 ? "" : "s"}`;
        if (!tableContainer.querySelector(".line-items-table")) {
          renderTableContent(tableContainer);
        }
      } else {
        tableContainer.style.display = "none";
        toggleLink.textContent = `Show line item${items.length === 1 ? "" : "s"} (${items.length})`;
      }
    });
    wrapper.append(toggleLink, tableContainer);
    return wrapper;
  }
  renderTableContent();
  return wrapper;
}
function renderDailyLogContent(item, query, highlightFn) {
  const wrapper = document.createElement("div");
  wrapper.className = "result-card__daily-log-content";
  if (item.weatherConditions) {
    const weatherSection = document.createElement("div");
    weatherSection.className = "daily-log__weather";
    const weatherHeader = document.createElement("h4");
    weatherHeader.className = "daily-log__section-header";
    weatherHeader.textContent = "\u{1F324}\uFE0F Weather Conditions";
    weatherSection.append(weatherHeader);
    const weatherInfo = document.createElement("div");
    weatherInfo.className = "daily-log__weather-info";
    const conditions = document.createElement("div");
    conditions.className = "daily-log__weather-condition";
    const conditionText = `${item.weatherConditions.description} - ${item.weatherConditions.temperature.current}\xB0${item.weatherConditions.temperature.unit} (Low: ${item.weatherConditions.temperature.low}\xB0${item.weatherConditions.temperature.unit})`;
    conditions.innerHTML = query && highlightFn ? highlightFn(conditionText, query) : conditionText;
    const windHumidity = document.createElement("div");
    windHumidity.className = "daily-log__weather-details";
    const detailsText = `Wind: ${item.weatherConditions.wind.speed} ${item.weatherConditions.wind.unit} | Humidity: ${item.weatherConditions.humidity}% | Precipitation: ${item.weatherConditions.precipitation.total} ${item.weatherConditions.precipitation.unit}`;
    windHumidity.innerHTML = query && highlightFn ? highlightFn(detailsText, query) : detailsText;
    weatherInfo.append(conditions, windHumidity);
    weatherSection.append(weatherInfo);
    wrapper.append(weatherSection);
  }
  if (item.weatherNotes) {
    const weatherNotesSection = document.createElement("div");
    weatherNotesSection.className = "daily-log__weather-notes";
    const weatherNotesHeader = document.createElement("h4");
    weatherNotesHeader.className = "daily-log__section-header";
    weatherNotesHeader.textContent = "\u{1F326}\uFE0F Weather Notes";
    weatherNotesSection.append(weatherNotesHeader);
    const weatherNotesContent = document.createElement("div");
    weatherNotesContent.className = "daily-log__weather-notes-content";
    weatherNotesContent.innerHTML = query && highlightFn ? highlightFn(item.weatherNotes, query) : item.weatherNotes;
    weatherNotesSection.append(weatherNotesContent);
    wrapper.append(weatherNotesSection);
  }
  const structuredNotesSection = document.createElement("div");
  structuredNotesSection.className = "daily-log__structured-notes";
  const structuredNotesHeader = document.createElement("h4");
  structuredNotesHeader.className = "daily-log__section-header";
  structuredNotesHeader.textContent = "\u{1F4DD} Daily Notes";
  structuredNotesSection.append(structuredNotesHeader);
  const notesContainer = document.createElement("div");
  notesContainer.className = "daily-log__notes-container";
  if (item.structuredNotes.progress) {
    const progressDiv = document.createElement("div");
    progressDiv.className = "daily-log__note-item";
    const progressLabel = document.createElement("strong");
    progressLabel.textContent = "Progress: ";
    const progressContent = document.createElement("span");
    progressContent.innerHTML = query && highlightFn ? highlightFn(item.structuredNotes.progress, query) : item.structuredNotes.progress;
    progressDiv.append(progressLabel, progressContent);
    notesContainer.append(progressDiv);
  }
  if (item.structuredNotes.issues) {
    const issuesDiv = document.createElement("div");
    issuesDiv.className = "daily-log__note-item daily-log__note-item--issues";
    const issuesLabel = document.createElement("strong");
    issuesLabel.textContent = "Issues: ";
    const issuesContent = document.createElement("span");
    issuesContent.innerHTML = query && highlightFn ? highlightFn(item.structuredNotes.issues, query) : item.structuredNotes.issues;
    issuesDiv.append(issuesLabel, issuesContent);
    notesContainer.append(issuesDiv);
  }
  if (item.structuredNotes.materialsDelivered) {
    const materialsDiv = document.createElement("div");
    materialsDiv.className = "daily-log__note-item";
    const materialsLabel = document.createElement("strong");
    materialsLabel.textContent = "Materials Delivered: ";
    const materialsContent = document.createElement("span");
    materialsContent.innerHTML = query && highlightFn ? highlightFn(item.structuredNotes.materialsDelivered, query) : item.structuredNotes.materialsDelivered;
    materialsDiv.append(materialsLabel, materialsContent);
    notesContainer.append(materialsDiv);
  }
  if (item.structuredNotes.additional) {
    const additionalDiv = document.createElement("div");
    additionalDiv.className = "daily-log__note-item";
    const additionalLabel = document.createElement("strong");
    additionalLabel.textContent = "Additional: ";
    const additionalContent = document.createElement("span");
    additionalContent.innerHTML = query && highlightFn ? highlightFn(item.structuredNotes.additional, query) : item.structuredNotes.additional;
    additionalDiv.append(additionalLabel, additionalContent);
    notesContainer.append(additionalDiv);
  }
  structuredNotesSection.append(notesContainer);
  wrapper.append(structuredNotesSection);
  return wrapper;
}
function getFieldLabel(field) {
  const labels = {
    title: "Title",
    summary: "Summary",
    project: "Project",
    client: "Client",
    status: "Status",
    documentType: "Document Type",
    author: "Author",
    tags: "Tags"
  };
  if (field.startsWith("lineItem") && field.includes("_")) {
    const [, index, type] = field.split("_");
    const typeLabels = {
      title: "Line Item Title",
      description: "Line Item Description",
      type: "Line Item Type"
    };
    return typeLabels[type] || "Line Item";
  }
  if (field.startsWith("metadata_")) {
    return "Metadata";
  }
  return labels[field] || field;
}
function renderProTipsState(message, state, query) {
  const proTips = getProTips(state, query);
  return `
    <div class="pro-tips-state">
      ${message ? `
        <div class="pro-tips-state__header">
          <h2 class="pro-tips-state__title">${message}</h2>
        </div>
      ` : ""}
      <div class="pro-tips-state__content">
        <div class="pro-tips">
          <h3 class="pro-tips__title">Pro Tips & Tricks</h3>
          <div class="pro-tips__grid">
            ${proTips.map((tip) => `
              <div class="pro-tip">
                <div class="pro-tip__content">
                  <h4 class="pro-tip__title">
                    <span class="pro-tip__icon">${tip.icon}</span>
                    ${tip.title}
                  </h4>
                  <p class="pro-tip__description">${tip.description}</p>
                  <div class="pro-tip__examples">
                    ${tip.examples.map((example) => `
                      <code class="pro-tip__example">${example}</code>
                    `).join("")}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}
function getProTips(state, query) {
  const tips = [];
  tips.push({
    icon: "\u{1F50D}",
    title: "Basic Text Search",
    description: "Search for any text in titles, summaries, projects, clients, and more.",
    examples: ["kitchen", "John Smith", "Project Alpha"]
  });
  tips.push({
    icon: "\u{1F4B0}",
    title: "Monetary Searches",
    description: "Find invoices, bills, and receipts by exact amounts or ranges.",
    examples: ["$1234.56", "$500-$1000", "$123"]
  });
  tips.push({
    icon: "\u{1F4CB}",
    title: "Entity Types",
    description: "Search for specific types of records and documents.",
    examples: ["invoices", "daily logs", "people"]
  });
  tips.push({
    icon: "\u{1F3D7}\uFE0F",
    title: "Project & Client Search",
    description: "Find records related to specific projects or clients.",
    examples: ["Project Alpha", "Rodgers Murphy", "residential"]
  });
  tips.push({
    icon: "\u26A1",
    title: "Buildertrend Navigation",
    description: "Use trigger queries to quickly navigate to specific Buildertrend sections.",
    examples: ["cost codes", "subs", "templates"]
  });
  tips.push({
    icon: "\u{1F4DD}",
    title: "Line Item Details",
    description: "Search within detailed line items of invoices and purchase orders.",
    examples: ["lumber", "labor", "material", "equipment"]
  });
  tips.push({
    icon: "\u{1F4CA}",
    title: "Status Filters",
    description: "Find records by their current status or workflow stage.",
    examples: ["pending", "approved", "paid", "overdue"]
  });
  tips.push({
    icon: "\u{1F3AF}",
    title: "Advanced Techniques",
    description: 'Combine multiple search terms with "AND" "OR" "NOT" (capitalized) and use facets to refine results.',
    examples: ["kitchen AND renovation", "invoice NOT pending", "Smith OR Johnson"]
  });
  if (state === "no-results" && query) {
    tips.unshift({
      icon: "\u{1F527}",
      title: "No Results? Try These",
      description: "Adjust your search strategy when no results are found.",
      examples: [
        "Use fewer keywords",
        "Check spelling",
        "Try broader or related terms",
        "Change formatting"
      ]
    });
  }
  if (state === "idle") {
    tips.unshift({
      icon: "\u{1F680}",
      title: "Get Started",
      description: "Begin your search with any of these popular search types.",
      examples: ["$500", "kitchen", "Smith Construction", "recent invoices"]
    });
  }
  return tips;
}
function renderRelatedItems(relatedEntities, sourceEntityId) {
  const section = document.createElement("div");
  section.className = "result-card__related-items";
  const header2 = document.createElement("h4");
  header2.className = "related-items__header";
  header2.textContent = "Related Items";
  const itemsList = document.createElement("div");
  itemsList.className = "related-items__list";
  relatedEntities.forEach((entity) => {
    const item = document.createElement("div");
    item.className = "related-item";
    const confidence = getRelationshipConfidence(sourceEntityId, entity.id);
    if (confidence) {
      item.classList.add(`related-item--${confidence}`);
    }
    const title = document.createElement("span");
    title.className = "related-item__title";
    title.textContent = entity.title;
    const type = document.createElement("span");
    type.className = "related-item__type";
    type.textContent = formatEntityType(entity.entityType);
    item.append(title, type);
    itemsList.append(item);
  });
  section.append(header2, itemsList);
  return section;
}
function renderSmartActions(smartActions, entity) {
  const section = document.createElement("div");
  section.className = "result-card__smart-actions";
  const header2 = document.createElement("h4");
  header2.className = "smart-actions__header";
  header2.textContent = "Quick Actions";
  const actionsList = document.createElement("div");
  actionsList.className = "smart-actions__list";
  smartActions.forEach((action, index) => {
    const actionElement = document.createElement("a");
    actionElement.href = action.href;
    actionElement.className = index === 0 ? "smart-action smart-action--primary" : "smart-action smart-action--secondary";
    actionElement.textContent = action.label;
    actionElement.title = action.description || action.label;
    actionElement.setAttribute("data-action-id", action.id);
    actionElement.setAttribute("data-entity-id", entity.id);
    actionElement.setAttribute("data-entity-type", entity.entityType);
    actionsList.append(actionElement);
  });
  section.append(header2, actionsList);
  return section;
}
function getRelationshipConfidence(sourceId, targetId) {
  return "explicit";
}
function renderFacetProTips(state) {
  const facetTips = getFacetProTips(state);
  return `
    <div class="facet-pro-tips">
      <h3 class="facet-pro-tips__title">Filter & Refine</h3>
      <div class="facet-pro-tips__list">
        ${facetTips.map((tip) => `
          <div class="facet-pro-tip">
            <div class="facet-pro-tip__icon">${tip.icon}</div>
            <div class="facet-pro-tip__content">
              <h4 class="facet-pro-tip__title">${tip.title}</h4>
              <p class="facet-pro-tip__description">${tip.description}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
function getFacetProTips(state) {
  const tips = [];
  if (state === "idle") {
    tips.push({
      icon: "\u{1F50D}",
      title: "Search First",
      description: "Run a search to see filter options and refine your results."
    });
    tips.push({
      icon: "\u26A1",
      title: "Quick Filters",
      description: "Use facets to narrow down results by type, project, status, and more."
    });
  } else {
    tips.push({
      icon: "\u{1F4CA}",
      title: "Type Filters",
      description: "Filter by Document, Invoice, Person, Organization, or Buildertrend records."
    });
    tips.push({
      icon: "\u{1F3D7}\uFE0F",
      title: "Project & Client",
      description: "Narrow results to specific projects or clients."
    });
    tips.push({
      icon: "\u{1F4B0}",
      title: "Amount Ranges",
      description: "Filter financial records by total value ranges."
    });
    tips.push({
      icon: "\u{1F4C5}",
      title: "Date Filters",
      description: "Find records by issue date ranges (last week, month, year)."
    });
    tips.push({
      icon: "\u{1F4CB}",
      title: "Status Filters",
      description: "Filter by record status like pending, approved, or paid."
    });
    tips.push({
      icon: "\u{1F3AF}",
      title: "Advanced Grouping",
      description: "Group results by type, project, status, or client for better organization."
    });
  }
  return tips;
}

// src/components/settingsView.ts
function createSettingsView() {
  const container = document.createElement("section");
  container.className = "settings-view";
  const heading = document.createElement("header");
  heading.innerHTML = `
    <h1>Prototype Settings</h1>
    <p>Adjust prototype behaviors. Changes save to the browser local storage and reload the experience.</p>
  `;
  const form = document.createElement("form");
  form.className = "settings-form";
  const overallSection = document.createElement("fieldset");
  overallSection.className = "settings-group";
  overallSection.innerHTML = `
    <legend>Overall</legend>
  `;
  const delayField = document.createElement("div");
  delayField.className = "settings-field";
  delayField.innerHTML = `
    <label for="search-delay">Simulated search delay mean (ms)</label>
  `;
  const delayInput = document.createElement("input");
  delayInput.id = "search-delay";
  delayInput.type = "number";
  delayInput.min = "0";
  delayInput.step = "10";
  delayField.append(delayInput);
  overallSection.append(delayField);
  const varianceField = document.createElement("div");
  varianceField.className = "settings-field";
  varianceField.innerHTML = `
    <label for="search-delay-variance">Search delay variance (ms)</label>
  `;
  const varianceInput = document.createElement("input");
  varianceInput.id = "search-delay-variance";
  varianceInput.type = "number";
  varianceInput.min = "0";
  varianceInput.step = "1";
  varianceField.append(varianceInput);
  overallSection.append(varianceField);
  const recentSearchesField = document.createElement("div");
  recentSearchesField.className = "settings-field";
  recentSearchesField.innerHTML = `
    <label for="recent-searches-limit">Recent searches to display</label>
  `;
  const recentSearchesSelect = document.createElement("select");
  recentSearchesSelect.id = "recent-searches-limit";
  recentSearchesSelect.innerHTML = `
    <option value="3">3 searches</option>
    <option value="5">5 searches</option>
    <option value="7">7 searches</option>
    <option value="10">10 searches</option>
    <option value="15">15 searches</option>
  `;
  recentSearchesField.append(recentSearchesSelect);
  overallSection.append(recentSearchesField);
  const resultsSection = document.createElement("fieldset");
  resultsSection.className = "settings-group";
  resultsSection.innerHTML = `
    <legend>Full Results Page</legend>
  `;
  const lineItemBehaviorField = document.createElement("div");
  lineItemBehaviorField.className = "settings-field";
  lineItemBehaviorField.innerHTML = `
    <label for="line-item-behavior">Line item behavior on results page</label>
  `;
  const lineItemBehaviorSelect = document.createElement("select");
  lineItemBehaviorSelect.id = "line-item-behavior";
  lineItemBehaviorSelect.innerHTML = `
    <option value="show-matched-only">Show only matched line items</option>
    <option value="show-matched-with-context-1">Show matched line items with 1 additional line of context before/after</option>
    <option value="show-matched-with-context-2">Show matched line items with 2 additional lines of context before/after</option>
    <option value="show-matched-with-context-3">Show matched line items with 3 additional lines of context before/after</option>
    <option value="show-matched-with-context-5">Show matched line items with 5 additional lines of context before/after</option>
    <option value="show-all-always">Always show all line items</option>
    <option value="hide-all-always">Always hide all line items, including matched</option>
  `;
  lineItemBehaviorField.append(lineItemBehaviorSelect);
  resultsSection.append(lineItemBehaviorField);
  const collapseLineItemsField = document.createElement("div");
  collapseLineItemsField.className = "settings-field settings-field--checkbox";
  const collapseLineItemsCheckbox = document.createElement("input");
  collapseLineItemsCheckbox.id = "collapse-irrelevant-line-items";
  collapseLineItemsCheckbox.type = "checkbox";
  const collapseLineItemsLabel = document.createElement("label");
  collapseLineItemsLabel.htmlFor = "collapse-irrelevant-line-items";
  collapseLineItemsLabel.textContent = 'Collapse irrelevant line items between results (shows "..." for large gaps between matches)';
  collapseLineItemsField.append(collapseLineItemsCheckbox, collapseLineItemsLabel);
  resultsSection.append(collapseLineItemsField);
  const collapseThresholdField = document.createElement("div");
  collapseThresholdField.className = "settings-field";
  collapseThresholdField.innerHTML = `
    <label for="line-items-collapse-threshold">Collapse threshold</label>
  `;
  const collapseThresholdSelect = document.createElement("select");
  collapseThresholdSelect.id = "line-items-collapse-threshold";
  collapseThresholdSelect.innerHTML = `
    <option value="3">3 items</option>
    <option value="5">5 items</option>
    <option value="7">7 items</option>
    <option value="10">10 items</option>
  `;
  collapseThresholdField.append(collapseThresholdSelect);
  resultsSection.append(collapseThresholdField);
  const maxFacetValuesField = document.createElement("div");
  maxFacetValuesField.className = "settings-field";
  maxFacetValuesField.innerHTML = `
    <label for="max-facet-values">Max facet values to show</label>
  `;
  const maxFacetValuesSelect = document.createElement("select");
  maxFacetValuesSelect.id = "max-facet-values";
  maxFacetValuesSelect.innerHTML = `
    <option value="3">3 values</option>
    <option value="5">5 values</option>
    <option value="7">7 values</option>
    <option value="10">10 values</option>
    <option value="15">15 values</option>
    <option value="20">20 values</option>
    <option value="0">Show all</option>
  `;
  maxFacetValuesField.append(maxFacetValuesSelect);
  resultsSection.append(maxFacetValuesField);
  const groupSection = document.createElement("fieldset");
  groupSection.className = "settings-group";
  groupSection.innerHTML = `
    <legend>Mini results group sizes</legend>
  `;
  const groupFields = document.createElement("div");
  groupFields.className = "settings-group__grid";
  groupSection.append(groupFields);
  const actions = document.createElement("div");
  actions.className = "settings-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "primary";
  saveButton.textContent = "Save & reload";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "secondary";
  resetButton.textContent = "Restore defaults";
  actions.append(saveButton, resetButton);
  form.append(overallSection, resultsSection, groupSection, actions);
  container.append(heading, form);
  const groupInputs = /* @__PURE__ */ new Map();
  const renderGroupInputs = (groupLimits) => {
    groupFields.innerHTML = "";
    groupInputs.clear();
    Object.entries(groupLimits).forEach(([key, value]) => {
      const field = document.createElement("label");
      field.className = "settings-field";
      field.htmlFor = `group-${key}`;
      const title = document.createElement("span");
      title.textContent = formatEntityType(key, { plural: true });
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.step = "1";
      input.id = `group-${key}`;
      input.value = String(value);
      field.append(title, input);
      groupFields.append(field);
      groupInputs.set(key, input);
    });
  };
  const render = () => {
    const state = settingsStore.getState();
    delayInput.value = String(state.searchDelayMs);
    varianceInput.value = String(state.searchDelayVarianceMs);
    recentSearchesSelect.value = String(state.recentSearchesDisplayLimit);
    lineItemBehaviorSelect.value = state.lineItemBehavior;
    collapseLineItemsCheckbox.checked = state.collapseIrrelevantLineItems;
    collapseThresholdSelect.value = String(state.lineItemsCollapseThreshold);
    maxFacetValuesSelect.value = String(state.maxFacetValues);
    renderGroupInputs(state.groupLimits);
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextDelay = Number.parseInt(delayInput.value, 10);
    const resolvedDelay = Number.isFinite(nextDelay) && nextDelay >= 0 ? nextDelay : 0;
    const nextVariance = Number.parseInt(varianceInput.value, 10);
    const resolvedVariance = Number.isFinite(nextVariance) && nextVariance >= 0 ? nextVariance : 10;
    const collapseThreshold = Number.parseInt(collapseThresholdSelect.value, 10);
    const resolvedCollapseThreshold = Number.isFinite(collapseThreshold) && collapseThreshold >= 0 ? collapseThreshold : 5;
    const maxFacetValues = Number.parseInt(maxFacetValuesSelect.value, 10);
    const resolvedMaxFacetValues = Number.isFinite(maxFacetValues) && maxFacetValues >= 0 ? maxFacetValues : 5;
    const recentSearchesLimit = Number.parseInt(recentSearchesSelect.value, 10);
    const resolvedRecentSearchesLimit = Number.isFinite(recentSearchesLimit) && recentSearchesLimit >= 0 ? recentSearchesLimit : 5;
    const groupLimits = {};
    groupInputs.forEach((input, key) => {
      const parsed = Number.parseInt(input.value, 10);
      groupLimits[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });
    settingsStore.update({
      searchDelayMs: resolvedDelay,
      searchDelayVarianceMs: resolvedVariance,
      lineItemBehavior: lineItemBehaviorSelect.value,
      collapseIrrelevantLineItems: collapseLineItemsCheckbox.checked,
      lineItemsCollapseThreshold: resolvedCollapseThreshold,
      maxFacetValues: resolvedMaxFacetValues,
      recentSearchesDisplayLimit: resolvedRecentSearchesLimit,
      groupLimits
    });
    window.location.reload();
  });
  resetButton.addEventListener("click", () => {
    settingsStore.reset();
    render();
    window.location.reload();
  });
  render();
  return {
    element: container,
    render
  };
}

// src/components/skeletonComponents.ts
function createSkeletonLine(options = {}) {
  const { width = "100%", height = "1rem", className = "", animated = true } = options;
  const line = document.createElement("div");
  line.className = `skeleton-line ${animated ? "skeleton-animated" : ""} ${className}`.trim();
  line.style.width = width;
  line.style.height = height;
  return line;
}
function createSkeletonRect(options = {}) {
  const { width = "100%", height = "4rem", className = "", animated = true } = options;
  const rect = document.createElement("div");
  rect.className = `skeleton-rect ${animated ? "skeleton-animated" : ""} ${className}`.trim();
  rect.style.width = width;
  rect.style.height = height;
  return rect;
}
function createSkeletonCircle(options = {}) {
  const { width = "2rem", height = "2rem", className = "", animated = true } = options;
  const circle = document.createElement("div");
  circle.className = `skeleton-circle ${animated ? "skeleton-animated" : ""} ${className}`.trim();
  circle.style.width = width;
  circle.style.height = height;
  return circle;
}

// src/components/homeSkeleton.ts
function createHomeSkeleton() {
  const container = document.createElement("div");
  container.className = "skeleton-home";
  const header2 = document.createElement("div");
  header2.className = "skeleton-home__header";
  const titleSection = document.createElement("div");
  titleSection.className = "skeleton-home__title-section";
  const projectTitle = createSkeletonLine({ width: "12rem", height: "1.5rem" });
  const statusBadge = createSkeletonRect({ width: "4rem", height: "1.5rem", className: "skeleton-home__status-badge" });
  titleSection.appendChild(projectTitle);
  titleSection.appendChild(statusBadge);
  header2.appendChild(titleSection);
  const infoLines = document.createElement("div");
  infoLines.className = "skeleton-home__info-lines";
  const addressLine = createSkeletonLine({ width: "16rem", height: "1rem" });
  const clockInLine = createSkeletonLine({ width: "14rem", height: "1rem" });
  const actionLink = createSkeletonLine({ width: "8rem", height: "1rem", className: "skeleton-home__action-link" });
  infoLines.appendChild(addressLine);
  infoLines.appendChild(clockInLine);
  infoLines.appendChild(actionLink);
  header2.appendChild(infoLines);
  const peopleSection = document.createElement("div");
  peopleSection.className = "skeleton-home__people-section";
  const clientsGroup = document.createElement("div");
  clientsGroup.className = "skeleton-home__people-group";
  const clientsLabel = createSkeletonLine({ width: "3rem", height: "1rem" });
  const clientsAvatars = document.createElement("div");
  clientsAvatars.className = "skeleton-home__people-avatars";
  const clientAvatar = createSkeletonCircle({ width: "2.5rem", height: "2.5rem" });
  clientsAvatars.appendChild(clientAvatar);
  clientsGroup.appendChild(clientsLabel);
  clientsGroup.appendChild(clientsAvatars);
  peopleSection.appendChild(clientsGroup);
  const managersGroup = document.createElement("div");
  managersGroup.className = "skeleton-home__people-group";
  const managersLabel = createSkeletonLine({ width: "6rem", height: "1rem" });
  const managersAvatars = document.createElement("div");
  managersAvatars.className = "skeleton-home__people-avatars";
  const managerAvatar1 = createSkeletonCircle({ width: "2rem", height: "2rem" });
  const managerAvatar2 = createSkeletonCircle({ width: "2rem", height: "2rem" });
  managersAvatars.appendChild(managerAvatar1);
  managersAvatars.appendChild(managerAvatar2);
  managersGroup.appendChild(managersLabel);
  managersGroup.appendChild(managersAvatars);
  peopleSection.appendChild(managersGroup);
  header2.appendChild(peopleSection);
  container.appendChild(header2);
  const mainContent = document.createElement("div");
  mainContent.className = "skeleton-home__main-content";
  const centralPanel = document.createElement("div");
  centralPanel.className = "skeleton-home__central-panel";
  const taskOverview = document.createElement("div");
  taskOverview.className = "skeleton-home__task-overview";
  const pastDueColumn = document.createElement("div");
  pastDueColumn.className = "skeleton-home__task-column";
  const pastDueHeader = createSkeletonLine({ width: "4rem", height: "1rem" });
  pastDueColumn.appendChild(pastDueHeader);
  taskOverview.appendChild(pastDueColumn);
  const dueTodayColumn = document.createElement("div");
  dueTodayColumn.className = "skeleton-home__task-column";
  const dueTodayHeader = createSkeletonLine({ width: "5rem", height: "1rem" });
  const thumbsUpIcon = createSkeletonRect({ width: "3rem", height: "3rem", className: "skeleton-home__task-icon" });
  const motivationalMessage = createSkeletonLine({ width: "8rem", height: "1rem" });
  dueTodayColumn.appendChild(dueTodayHeader);
  dueTodayColumn.appendChild(thumbsUpIcon);
  dueTodayColumn.appendChild(motivationalMessage);
  taskOverview.appendChild(dueTodayColumn);
  const actionItemsColumn = document.createElement("div");
  actionItemsColumn.className = "skeleton-home__task-column";
  const actionItemsHeader = createSkeletonLine({ width: "6rem", height: "1rem" });
  actionItemsColumn.appendChild(actionItemsHeader);
  taskOverview.appendChild(actionItemsColumn);
  centralPanel.appendChild(taskOverview);
  const activitySection = document.createElement("div");
  activitySection.className = "skeleton-home__activity-section";
  const activityHeader = document.createElement("div");
  activityHeader.className = "skeleton-home__activity-header";
  const activityTitle = createSkeletonLine({ width: "12rem", height: "1.25rem" });
  const activityFilter = createSkeletonRect({ width: "3rem", height: "2rem", className: "skeleton-home__activity-filter" });
  activityHeader.appendChild(activityTitle);
  activityHeader.appendChild(activityFilter);
  activitySection.appendChild(activityHeader);
  const activityList = document.createElement("div");
  activityList.className = "skeleton-home__activity-list";
  const activityDate = createSkeletonLine({ width: "6rem", height: "1.25rem", className: "skeleton-home__activity-date" });
  activityList.appendChild(activityDate);
  const activityItems = document.createElement("div");
  activityItems.className = "skeleton-home__activity-items";
  for (let i = 0; i < 3; i++) {
    const activityItem = document.createElement("div");
    activityItem.className = "skeleton-home__activity-item";
    const avatar = createSkeletonCircle({ width: "2rem", height: "2rem", className: "skeleton-home__activity-avatar" });
    const content = document.createElement("div");
    content.className = "skeleton-home__activity-content";
    const primaryLine = createSkeletonLine({ width: "14rem", height: "1rem" });
    const actionLine = createSkeletonLine({ width: "10rem", height: "0.875rem" });
    if (i < 2) {
      const detailLine = createSkeletonLine({ width: "8rem", height: "0.875rem" });
      content.appendChild(detailLine);
    }
    content.appendChild(primaryLine);
    content.appendChild(actionLine);
    activityItem.appendChild(avatar);
    activityItem.appendChild(content);
    activityItems.appendChild(activityItem);
  }
  activityList.appendChild(activityItems);
  activitySection.appendChild(activityList);
  centralPanel.appendChild(activitySection);
  mainContent.appendChild(centralPanel);
  const sidebar = document.createElement("div");
  sidebar.className = "skeleton-home__sidebar";
  const updatesSection = document.createElement("div");
  updatesSection.className = "skeleton-home__updates-section";
  const updatesMetric = createSkeletonRect({ width: "4rem", height: "4rem", className: "skeleton-home__updates-metric" });
  const updatesDescription = createSkeletonLine({ width: "10rem", height: "1rem" });
  const updatesActions = document.createElement("div");
  updatesActions.className = "skeleton-home__updates-actions";
  const clientUpdatesBtn = createSkeletonRect({ width: "5rem", height: "2rem" });
  const dailyLogsBtn = createSkeletonRect({ width: "4rem", height: "2rem" });
  updatesActions.appendChild(clientUpdatesBtn);
  updatesActions.appendChild(dailyLogsBtn);
  updatesSection.appendChild(updatesMetric);
  updatesSection.appendChild(updatesDescription);
  updatesSection.appendChild(updatesActions);
  sidebar.appendChild(updatesSection);
  const agendaSection = document.createElement("div");
  agendaSection.className = "skeleton-home__agenda-section";
  const agendaHeader = document.createElement("div");
  agendaHeader.className = "skeleton-home__agenda-header";
  const agendaTitle = createSkeletonLine({ width: "8rem", height: "1.25rem" });
  const agendaLink = createSkeletonLine({ width: "6rem", height: "1rem", className: "skeleton-home__agenda-link" });
  agendaHeader.appendChild(agendaTitle);
  agendaHeader.appendChild(agendaLink);
  agendaSection.appendChild(agendaHeader);
  const agendaList = document.createElement("div");
  agendaList.className = "skeleton-home__agenda-list";
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (let i = 0; i < days.length; i++) {
    const agendaItem = document.createElement("div");
    agendaItem.className = "skeleton-home__agenda-item";
    const dateIndicator = createSkeletonRect({ width: "2rem", height: "2rem", className: "skeleton-home__agenda-date" });
    const content = document.createElement("div");
    content.className = "skeleton-home__agenda-content";
    const dayLine = createSkeletonLine({ width: "4rem", height: "1rem" });
    const dateLine = createSkeletonLine({ width: "3rem", height: "0.875rem" });
    content.appendChild(dayLine);
    content.appendChild(dateLine);
    if (i >= 5) {
      const nonWorkdayLine = createSkeletonLine({ width: "5rem", height: "0.75rem" });
      content.appendChild(nonWorkdayLine);
    }
    agendaItem.appendChild(dateIndicator);
    agendaItem.appendChild(content);
    agendaList.appendChild(agendaItem);
  }
  agendaSection.appendChild(agendaList);
  sidebar.appendChild(agendaSection);
  mainContent.appendChild(sidebar);
  container.appendChild(mainContent);
  return container;
}

// src/state/appState.ts
var initialState2 = {
  route: "home",
  searchQuery: "",
  lastSubmittedQuery: "",
  facetSelections: {},
  sortBy: "relevance",
  recentResponse: null,
  searchStatus: "idle",
  dialogOpen: false,
  errorMessage: void 0
};
function cloneSelections(selections) {
  const next = {};
  for (const key of Object.keys(selections)) {
    const values = selections[key];
    if (values && values.size > 0) {
      next[key] = new Set(values);
    }
  }
  return next;
}
var store2 = createStore(initialState2);
var appState = {
  getState: store2.getState,
  subscribe: store2.subscribe,
  setRoute(route) {
    store2.setState({ route });
  },
  setSearchQuery(searchQuery) {
    store2.setState({ searchQuery });
  },
  setDialogOpen(dialogOpen) {
    store2.setState({ dialogOpen });
  },
  setStatus(status, errorMessage) {
    store2.setState({ searchStatus: status, errorMessage });
  },
  setResponse(response) {
    store2.setState({ recentResponse: response });
  },
  setLastSubmittedQuery(query) {
    store2.setState({ lastSubmittedQuery: query });
  },
  setSortBy(sortBy) {
    console.log("\u{1F504} setSortBy called:", sortBy);
    store2.setState({ sortBy });
  },
  clearFacets() {
    store2.setState({ facetSelections: {} });
  },
  toggleFacet(key, value) {
    console.log("\u{1F504} toggleFacet called:", { key, value });
    store2.setState((prev) => {
      const selections = cloneSelections(prev.facetSelections);
      console.log("\u{1F504} Previous selections:", Object.keys(selections).map((k) => ({ key: k, values: Array.from(selections[k] || []) })));
      if (key === "groupBy") {
        if (selections[key]?.has(value)) {
          console.log("\u{1F504} Deselecting", key, value);
          delete selections[key];
        } else {
          console.log("\u{1F504} Selecting", key, value);
          selections[key] = /* @__PURE__ */ new Set([value]);
        }
      } else {
        const current = selections[key] ?? /* @__PURE__ */ new Set();
        if (current.has(value)) {
          current.delete(value);
        } else {
          current.add(value);
        }
        if (current.size === 0) {
          delete selections[key];
        } else {
          selections[key] = current;
        }
      }
      console.log("\u{1F504} New selections:", Object.keys(selections).map((k) => ({ key: k, values: Array.from(selections[k] || []) })));
      return {
        ...prev,
        facetSelections: selections
      };
    });
  },
  replaceFacets(nextSelections) {
    const clone = cloneSelections(nextSelections);
    store2.setState({ facetSelections: clone });
  },
  reset() {
    store2.setState(initialState2);
  }
};

// src/main.ts
function isMonetaryQuery(query) {
  return query.trim().startsWith("$");
}
var root = document.querySelector("#app");
if (!root) {
  throw new Error("Root container #app not found");
}
var main = document.createElement("main");
main.className = "app-main";
var activeSearchToken = 0;
var searchDebounceTimer = null;
function debouncedSearch(value, options) {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  const effectiveLength = getEffectiveQueryLength(value.trim());
  let delay;
  if (effectiveLength <= 2) {
    delay = 0;
  } else if (effectiveLength <= 4) {
    delay = 25;
  } else if (effectiveLength <= 6) {
    delay = 75;
  } else {
    delay = 100;
  }
  if (delay === 0) {
    void performSearch(value, options);
  } else {
    searchDebounceTimer = window.setTimeout(() => {
      void performSearch(value, options);
      searchDebounceTimer = null;
    }, delay);
  }
}
var header = createHeader({
  onNavigate: (route) => navigate(route),
  onHome: () => {
    appState.setSearchQuery("");
    appState.setLastSubmittedQuery("");
    appState.setResponse(null);
    appState.setStatus("idle");
    appState.setDialogOpen(false);
    appState.clearFacets();
    clearHighlightCache();
    navigate("home");
  },
  onSearchChange: (value) => {
    const currentState = appState.getState();
    const previousQuery = currentState.lastSubmittedQuery || currentState.searchQuery;
    if (value.trim() !== previousQuery.trim()) {
      appState.clearFacets();
    }
    appState.setSearchQuery(value);
    header.setMonetarySearchMode(isMonetaryQuery(value));
    const isHome = appState.getState().route === "home";
    debouncedSearch(value, { openDialog: isHome, updateSubmitted: !isHome });
  },
  onSearchSubmit: () => {
    navigate("results");
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  },
  onSearchFocus: () => {
    if (appState.getState().route !== "home") {
      return;
    }
    const channel = new MessageChannel();
    channel.port2.onmessage = () => {
      appState.setDialogOpen(true);
      const query = appState.getState().searchQuery;
      if (query.trim()) {
        debouncedSearch(query, { openDialog: true, updateSubmitted: false });
      }
    };
    channel.port1.postMessage(null);
  },
  onSearchBlur: () => {
  },
  onSearchKeyDown: (event) => {
    if (!["Enter", "Escape", "ArrowDown", "ArrowUp"].includes(event.key)) {
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && appState.getState().dialogOpen) {
      event.preventDefault();
      event.stopPropagation();
      navigate("results");
      void performSearch(appState.getState().searchQuery, { openDialog: false });
      return;
    }
    if (event.key === "Escape") {
      appState.setDialogOpen(false);
      header.searchInput.blur();
    }
    if (appState.getState().dialogOpen && appState.getState().recentResponse && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      event.stopPropagation();
      header.searchInput.blur();
      const dialog = document.querySelector(".search-dialog");
      if (dialog) {
        dialog.focus();
      }
      const customEvent = new KeyboardEvent("keydown", {
        key: event.key,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(customEvent);
    }
  }
});
var searchDialog = createSearchDialog(header.dialogHost, {
  onSeeAllResults: () => {
    navigate("results");
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  }
});
searchDialog.setState({
  visible: false,
  status: appState.getState().searchStatus,
  query: appState.getState().searchQuery,
  response: appState.getState().recentResponse,
  selectedIndex: -1
});
var resultsView = createResultsView({
  onFacetToggle: (key, value) => {
    console.log("\u{1F3AF} onFacetToggle called:", { key, value });
    appState.toggleFacet(key, value);
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    console.log("\u{1F50D} Triggering search after facet toggle with query:", query);
    if (query) {
      void performSearch(query, { openDialog: false });
    }
  },
  onClearFacets: () => {
    appState.clearFacets();
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query) {
      void performSearch(query, { openDialog: false });
    }
  },
  onSortByChange: (sortBy) => {
    console.log("\u{1F3AF} onSortByChange called:", sortBy);
    appState.setSortBy(sortBy);
  }
});
var settingsView = createSettingsView();
var homeScreen = document.createElement("section");
homeScreen.id = "screen-home";
homeScreen.dataset.screen = "home";
homeScreen.className = "screen screen--home";
homeScreen.appendChild(createHomeSkeleton());
var resultsScreen = document.createElement("section");
resultsScreen.id = "screen-results";
resultsScreen.dataset.screen = "results";
resultsScreen.className = "screen screen--results";
resultsScreen.append(resultsView.element);
var settingsScreen = document.createElement("section");
settingsScreen.id = "screen-settings";
settingsScreen.dataset.screen = "settings";
settingsScreen.className = "screen screen--settings";
settingsScreen.append(settingsView.element);
main.append(homeScreen, resultsScreen, settingsScreen);
root.append(header.element, main);
requestAnimationFrame(() => {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.warn("Error initializing header icons:", error);
    }
  }
});
var screens = {
  home: homeScreen,
  results: resultsScreen,
  settings: settingsScreen
};
function navigate(route) {
  const previousRoute = appState.getState().route;
  appState.setRoute(route);
  if (route !== "home") {
    appState.setDialogOpen(false);
  }
  if (route === "results") {
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query && previousRoute !== "results") {
      void performSearch(query, { openDialog: false });
    }
  }
}
async function performSearch(query, options = {}) {
  const { openDialog = false, updateSubmitted = true } = options;
  const trimmed = query.trim();
  const effectiveLength = getEffectiveQueryLength(trimmed);
  if (openDialog && appState.getState().route === "home") {
    appState.setDialogOpen(true);
  }
  if (effectiveLength === 0) {
    activeSearchToken += 1;
    if (updateSubmitted) {
      appState.setLastSubmittedQuery("");
    }
    appState.setStatus("idle");
    appState.setResponse(null);
    return;
  }
  if (effectiveLength < MIN_EFFECTIVE_QUERY_LENGTH) {
    activeSearchToken += 1;
    if (updateSubmitted) {
      appState.setLastSubmittedQuery("");
    }
    appState.setStatus("idle");
    appState.setResponse(null);
    return;
  }
  const requestId = ++activeSearchToken;
  appState.setStatus("loading");
  try {
    const facetSelections = appState.getState().facetSelections;
    console.log("\u{1F50D} performSearch - facetSelections:", {
      allSelections: Object.keys(facetSelections).map((key) => ({
        key,
        values: Array.from(facetSelections[key] || [])
      }))
    });
    const channel = new MessageChannel();
    channel.port2.onmessage = async () => {
      try {
        const response = await runSearch({
          query: trimmed,
          selections: facetSelections
        });
        if (requestId !== activeSearchToken) {
          return;
        }
        appState.setResponse(response);
        appState.setStatus("ready");
        if (updateSubmitted) {
          appState.setLastSubmittedQuery(trimmed);
          recentSearches.addSearch(trimmed, response.totalResults);
        }
        if (openDialog && appState.getState().route === "home") {
          appState.setDialogOpen(true);
        }
      } catch (error) {
        if (requestId !== activeSearchToken) {
          return;
        }
        console.error("Search failed", error);
        appState.setStatus("error", "Unable to complete search. Try again.");
      }
    };
    channel.port1.postMessage(null);
  } catch (error) {
    if (requestId !== activeSearchToken) {
      return;
    }
    console.error("Search failed", error);
    appState.setStatus("error", "Unable to complete search. Try again.");
  }
}
function focusSearchBar() {
  header.searchInput.focus();
  header.searchInput.select();
  const isHome = appState.getState().route === "home";
  if (isHome) {
    appState.setDialogOpen(true);
    const query = appState.getState().searchQuery;
    if (query.trim()) {
      void performSearch(query, { openDialog: true, updateSubmitted: false });
    }
  } else {
    appState.setDialogOpen(false);
  }
}
function handleGlobalKeydown(event) {
  if (!["/", "k", "Escape", "ArrowDown", "ArrowUp"].includes(event.key)) {
    return;
  }
  const target = event.target;
  const isEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable) {
    event.preventDefault();
    focusSearchBar();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    focusSearchBar();
    return;
  }
  if (event.key === "Escape" && appState.getState().dialogOpen) {
    appState.setDialogOpen(false);
    header.searchInput.blur();
  }
  if (appState.getState().dialogOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
  }
}
function handleDocumentClick(event) {
  if (!appState.getState().dialogOpen) {
    return;
  }
  const target = event.target;
  if (target && header.element.contains(target)) {
    return;
  }
  appState.setDialogOpen(false);
}
var previousState = null;
appState.subscribe((state) => {
  if (!previousState || previousState.route !== state.route) {
    Object.entries(screens).forEach(([route, element]) => {
      element.hidden = route !== state.route;
    });
  }
  if (!previousState || previousState.searchQuery !== state.searchQuery) {
    header.searchInput.value = state.searchQuery;
  }
  if (!previousState || previousState.route !== state.route) {
    header.setActiveRoute(state.route);
  }
  const dialogStateChanged = !previousState || previousState.dialogOpen !== state.dialogOpen || previousState.route !== state.route || previousState.searchStatus !== state.searchStatus || previousState.searchQuery !== state.searchQuery || previousState.recentResponse !== state.recentResponse;
  if (dialogStateChanged) {
    const queryChanged = !previousState || previousState.searchQuery !== state.searchQuery;
    searchDialog.setState({
      visible: state.dialogOpen && state.route === "home",
      status: state.searchStatus,
      query: state.searchQuery,
      response: state.recentResponse,
      isMonetarySearch: isMonetaryQuery(state.searchQuery),
      selectedIndex: queryChanged ? -1 : previousState?.selectedIndex ?? -1
      // Preserve existing selection or default to -1
    });
  }
  const resultsStateChanged = !previousState || previousState.recentResponse !== state.recentResponse || previousState.facetSelections !== state.facetSelections || previousState.sortBy !== state.sortBy || previousState.searchStatus !== state.searchStatus || previousState.lastSubmittedQuery !== state.lastSubmittedQuery || previousState.searchQuery !== state.searchQuery || previousState.errorMessage !== state.errorMessage;
  if (resultsStateChanged) {
    const channel = new MessageChannel();
    channel.port2.onmessage = () => {
      resultsView.render({
        response: state.recentResponse,
        selections: state.facetSelections,
        sortBy: state.sortBy,
        status: state.searchStatus,
        query: state.lastSubmittedQuery || state.searchQuery,
        errorMessage: state.errorMessage,
        isMonetarySearch: isMonetaryQuery(state.lastSubmittedQuery || state.searchQuery)
      });
    };
    channel.port1.postMessage(null);
  }
  previousState = state;
});
document.addEventListener("keydown", handleGlobalKeydown);
document.addEventListener("mousedown", handleDocumentClick);
function handleSearchQueryEvent(event) {
  const query = event.detail?.query;
  if (query && typeof query === "string") {
    appState.setSearchQuery(query);
    header.setMonetarySearchMode(isMonetaryQuery(query));
    navigate("results");
    void performSearch(query, { openDialog: false });
  }
}
document.addEventListener("search-query", handleSearchQueryEvent, true);
window.addEventListener("search-query", handleSearchQueryEvent, true);
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.warn("Error initializing Lucide icons:", error);
    }
  }
});
appState.setRoute("home");
//# sourceMappingURL=main.js.map
