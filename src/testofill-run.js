//---------------------------------------------------------------------- FILL FORM
/* Apply the selected rule set to the current page, filling its form(s).
 * ruleSet ex.: {"name":"kid user test", "fields":
 *  [{"query": "[name='q']", "value": "Hi!"}]}
 *
 */
function fillForms(ruleSet) {
  if (typeof ruleSet === 'undefined') return;

  var unmatchedSelectors = [];
  ruleSet.fields.forEach(function(field) {
    var fieldElms = Sizzle(field.query);
    if (fieldElms.length === 0) {
      unmatchedSelectors.push(field);
    } else {
      fieldElms.forEach(function(inputElm) {
        fillField(inputElm, field);
      });
    }
  });

  if (unmatchedSelectors.length > 0) {
    console.log("Warning: some fields matched nothing in the set named " +
                ruleSet.name,
                unmatchedSelectors);
  }

}

/* Apply rule to a field to fill it (exec. for each matching field, e.g. radio). */
function fillField(fieldElm, fieldRule) {
  if (fieldElm.type === 'checkbox') {
    fieldElm.checked = fieldRule.value;
  } else if (fieldElm.type === 'select-one') {
    for(var i = fieldElm.length - 1; i >= 0; i--) {
      var opt = fieldElm[i];
      opt.selected = (opt.value === fieldRule.value);
    }
  } else if (fieldElm.type === 'select-multiple') {
    if (!Array.isArray(fieldRule.value)) {
      console.error("The form element is a select-multiple and thus the value " +
        "to fill in should be an array of 0+ values but it is not an array; " +
                    "query: " + fieldRule.query + ", the value: ", fieldRule.value,
                    "; the field: ", fieldElm);
      return;
    }
    for(var j = fieldElm.length - 1; j >= 0; j--) {
      var multiOpt = fieldElm[j];
      multiOpt.selected = (fieldRule.value.indexOf(multiOpt.value) >= 0);
    }
  } else if (fieldElm.type === 'radio') {
    fieldElm.checked = (fieldElm.value === fieldRule.value);
    // find the one with matching value or unset all
  } else if (fieldRule.textContent) {
    fieldElm.textContent = fieldRule.textContent; // labels, text elements
  } else {
    fieldElm.value = fieldRule.value;
  }
}

//---------------------------------------------------------------------- SAVE FORM

/**
 * Find all forms on the page, create query+value pair for each relevant field,
 * return an array of {name: .., fields: [..]} that can be merged into the existing config.
 */
function makeTestofillJsonFromPageForms() {
  var formListJson =
    _.map(document.forms, function(form){
      var formName = "TODO Name this " + form.id;
      var fieldElms = Sizzle(":input", form); // Find inputs and  textareas, selects, and buttons:
      var jsonFields = _.chain(fieldElms)
          .filter(function(f) {return f.name !== "" && f.type !== "button";})
          .groupBy('name') // group f.ex. radios into one array
          .map(_.values) // turn {'fieldName': [field1, field2,...]} into just the array of fields
          .map(function(inputGrp) {
            return {"query": makeQueryFrom(inputGrp[0]), "value": makeValueFrom(inputGrp)};
          })
          .value();

      return {"name": formName, "fields": jsonFields};
    });

  alert("Input from " + formListJson.length + " forms is going to be saved for " + document.location.toString());

  return formListJson;
}

function makeQueryFrom(input) {
  return "[name='" + input.name + "']";
}

function makeValueFrom(inputGrp) {
  if (inputGrp.length > 1) { // group of radio buttons
    return _.chain(inputGrp)
      .where({checked: true})
      .pluck('value')
      .sample() // list to (the only one) single element or undefined
      .value(); // -> undefined if no match
  }

  var fieldElm = inputGrp[0];
  if (fieldElm.type === 'checkbox') {
    return fieldElm.checked;
  } else if (fieldElm.type === 'select-one') {
    return fieldElm.selectedOptions[0].value; // TODO if none selected?
  } else if (fieldElm.type === 'select-multiple') {
    return _.pluck(fieldElm.selectedOptions, 'value');
  } else {
    return fieldElm.value;
  }
}

//---------------------------------------------------------------------- LISTENERS

// Listen for message from the popup or ctx. menu with the selected ruleSet
chrome.runtime.onMessage.addListener(function(message, sender, sendResponseFn){
  var fromExtension = !sender.tab;
  if (!fromExtension) return;

  if (message.id === "fill_form") {
    var ruleSet = message.payload;
    fillForms(ruleSet);
  } else if (message.id === "save_form") {
    sendResponseFn(makeTestofillJsonFromPageForms());
  } else {
    console.log("ERROR: Unsupported message id received: " + message.id, message);
  }

});
