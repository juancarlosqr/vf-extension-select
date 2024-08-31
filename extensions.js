const uiDefault = {
  primaryButtonColor: '#2e7ff1',
  primaryButtonColorHover: '#0c74e4',
  primaryButtonTextLabel: 'Confirm',
  primaryButtonTextColor: '#ffffff',
  destructiveButtonColor: '#db1b42',
  destructiveButtonColorHover: '#cd0038',
  destructiveButtonTextLabel: 'Cancel',
  destructiveButtonTextColor: '#ffffff',
  defaultOptionText: 'Select option',
};

const validateData = (data) => {
  if (!Array.isArray(data)) {
    throw new Error('Invalid data: must be an array');
  }

  if (!data.length) {
    throw new Error('Invalid data: must have values');
  }

  data.forEach((item) => {
    if (typeof item !== 'string') {
      if (!Object.hasOwn(item, 'text') || !Object.hasOwn(item, 'value')) {
        throw new Error(
          'Invalid data: items must be either strings or objects with text and value keys'
        );
      }
    }
  });
};

const process = (trace) => {
  let { data = [], ui = {} } = trace.payload;

  // throws error if data is invalid
  validateData(data);

  // merge ui options objects
  ui = Object.assign({}, uiDefault, ui);

  return { data, ui };
};

const createSelectElement = (data, ui) => {
  let selectedOption = null;

  const selectElement = document.createElement('select');
  selectElement.id = 'selectInput';
  selectElement.required = true;

  // create default option
  const optionDefault = document.createElement('option');
  optionDefault.text = ui.defaultOptionText;
  optionDefault.value = '';
  selectElement.appendChild(optionDefault);

  // create data options
  data.forEach((item) => {
    const optionElement = document.createElement('option');

    if (typeof item === 'string' || item instanceof String) {
      optionElement.text = item;
      optionElement.value = item;
    } else {
      optionElement.text = item.text;
      optionElement.value = item.value;
      if (item.selected) {
        optionElement.selected = true;
        selectedOption = item.value;
      }
    }

    selectElement.appendChild(optionElement);
  });

  return { selectElement, selectedOption };
};

const createFormContainer = (ui) => {
  const formContainer = document.createElement('div');

  formContainer.innerHTML = `
    <style>
      #container {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        margin: 0;
        padding: 0;
        width: 225px;
        max-width: none;
        overflow: visible;
        overflowX: hidden;
        overflowY: hidden;
      }
      #selectInput {
        padding: 5px;
        border-radius: 8px;
        border-color: #ddd;
        font-size: 15px;
      }
      #buttonContainer {
        display: flex;
        gap: 10px;
        margin-top: 10px;
        transition: opacity 0.3s ease;
      }
      #submitButton, #cancelButton {
        font-size: 15px;
        font-weight: 600;
        border: none;
        padding: 10px;
        border-radius: 8px;
        cursor: pointer;
      }
      #submitButton {
        flex: 1;
        color: ${ui.primaryButtonTextColor};
        background: ${ui.primaryButtonColor};
      }
      #submitButton:hover:not(:disabled) {
        background: ${ui.primaryButtonColorHover};
      }
      #cancelButton {
        flex: 1;
        color: ${ui.destructiveButtonTextColor};
        background: ${ui.destructiveButtonColor};
      }
      #cancelButton:hover:not(:disabled) {
        background: ${ui.destructiveButtonColorHover};
      }
      #submitButton:disabled, #cancelButton:disabled {
        background: #ccc;
        cursor: not-allowed;
        color: #666;
      }
    </style>
    <form id="form">
      <div id="container"></div>
      <div id="buttonContainer">
        <button id="submitButton" type="submit">${ui.primaryButtonTextLabel}</button>
        <button id="cancelButton" type="button">${ui.destructiveButtonTextLabel}</button>
      </div>
    </form>`;

  return formContainer;
};

export const VFSelectExtension = {
  name: 'Select',
  type: 'response',
  match: ({ trace }) =>
    trace.type === 'ext_select_input' ||
    trace.payload.name === 'ext_select_input',
  render: ({ trace, element }) => {
    try {
      const { data, ui } = process(trace);

      // form container
      const formContainer = createFormContainer(ui);

      // select container
      const selectContainer = formContainer.querySelector('#container');

      // select element
      let { selectElement, selectedOption } = createSelectElement(data, ui);
      selectElement.addEventListener('change', (event) => {
        selectedOption = event.target.value;
      });
      selectContainer.appendChild(selectElement);

      // submit button
      const submitButton = formContainer.querySelector('#submitButton');

      // cancel button
      const cancelButton = formContainer.querySelector('#cancelButton');
      cancelButton.addEventListener('click', () => {
        // push cancel event to voiceflow runtime
        window.voiceflow.chat.interact({
          type: 'cancel',
        });
        selectElement.disabled = true;
        submitButton.disabled = true;
        cancelButton.disabled = true;
      });

      // form
      const form = formContainer.querySelector('#form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        // push complete event to voiceflow runtime
        window.voiceflow.chat.interact({
          type: 'complete',
          payload: { value: selectedOption },
        });
        selectElement.disabled = true;
        submitButton.disabled = true;
        cancelButton.disabled = true;
      });

      // add form container to voiceflow element
      element.appendChild(formContainer);
    } catch (error) {
      console.log('VFSelectExtension', error);

      // push error event to voiceflow runtime
      window.voiceflow.chat.interact({
        type: 'error',
        payload: { message: error.message ?? 'Unknown error' },
      });
    }
  },
};
