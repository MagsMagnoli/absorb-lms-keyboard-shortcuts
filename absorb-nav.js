javascript: void (function() {
  const iframes = document.querySelectorAll('iframe');

  if (iframes.length < 2) {
    console.error("Can't locate iframe, refresh page");
    return;
  }

  const frame = iframes[1].contentDocument.querySelector('frame');

  if (!frame || !frame.contentDocument) {
    console.error("Can't locate frame, refresh page");
    return;
  }

  const frameDoc = frame.contentDocument;

  // item types
  const TYPE_BINARY = 'binary';
  const TYPE_GRAPHICALCHOICE = 'graphicalchoice';
  const TYPE_HOTSPOT = 'hotspot';
  const TYPE_MULTICHOICE = 'multichoice';

  clearData();

  frameDoc.addEventListener('keydown', navigationListener);

  console.info(
    'Absorb shortcuts initialized\n' +
      "Press 'Q' to query items\n" +
      "Press 'W' and 'S' to navigate elements\n" +
      "Press 'A' and 'D' to execute primary and secondary actions\n" +
      'Press left and right arrows to navigate pages\n' +
      "Press 'Escape' to quit",
  );

  queryAllItems();

  function resetactiveItem() {
    activeItem = null;
    activeItemIdx = null;
    activeSubItem = null;
    activeSubItemIdx = null;
  }

  function queryAllItems() {
    frameDoc.querySelectorAll('.visible-xs').forEach(node => node.remove());
    items = [];

    const binaryItems = findBinaryItems();
    const graphicalchoiceItems = findGraphicalChoiceItems();
    const hotspotItems = findHotspotItems();
    const multichoiceItems = findMultiChoiceItems();

    if (binaryItems.length > 0) {
      items.push({ type: TYPE_BINARY, subItems: binaryItems });
    }

    if (graphicalchoiceItems.length > 0) {
      items.push({
        type: TYPE_GRAPHICALCHOICE,
        subItems: graphicalchoiceItems,
      });
    }

    if (hotspotItems.length > 0) {
      items.push({ type: TYPE_HOTSPOT, subItems: hotspotItems });
    }

    if (multichoiceItems.length > 0) {
      items.push({ type: TYPE_MULTICHOICE, subItems: multichoiceItems });
    }

    if (items.length <= 0) {
      console.log('No items found');
      resetactiveItem();
      return;
    }

    if (activeItem == null) {
      activeItem = items[0];
      activeItemIdx = 0;
      activeSubItem = activeItem.subItems[0];
      activeSubItemIdx = 0;
    } else {
      activeItem = items[activeItemIdx];
      activeSubItem = activeItem.subItems[activeSubItemIdx];
    }

    highlightQueriedItems(items);
    setActiveItem(activeItem);
    setActiveSubItem(activeSubItem);
  }

  function highlightQueriedItems(items) {
    items.map(highlightQueriedItem);
  }

  function highlightQueriedItem(item) {
    item.subItems.forEach(highlightQueriedElement);
  }

  function highlightQueriedElement(elm) {
    elm.style.border = '3px dotted black';
    elm.style.margin = '3px';
  }

  function highlightInactiveElement(elm) {
    elm.style.border = '3px solid black';
    elm.style.margin = '3px';
  }

  function highlightActiveElement(elm) {
    elm.style.border = '3px solid red';
    elm.style.margin = '3px';
  }

  function setActiveItem(item) {
    item.subItems.forEach(highlightInactiveElement);
  }

  function setActiveSubItem(subItem) {
    highlightActiveElement(subItem);
  }

  function navigationListener(e) {
    e.preventDefault();
    e.stopPropagation();
    const keycode = e.keyCode ? e.keyCode : e.which;

    switch (keycode) {
      case 81:
        queryAllItems();
        break;
      case 87:
        selectPreviousItem();
        break;
      case 83:
        selectNextItem();
        break;
      case 65:
        executePrimaryAction();
        break;
      case 68:
        executeSecondaryAction();
        break;
      case 39:
        const next = findNavNext();
        navNext(next);
        clearData();
        setTimeout(queryAllItems, 750);
        break;
      case 37:
        const prev = findNavPrev();
        navPrev(prev);
        clearData();
        setTimeout(queryAllItems, 750);
        break;
      case 27:
        frameDoc.removeEventListener('keydown', navigationListener);
        console.info('Absorb navigation terminated');
        break;
    }
  }

  function selectNextItem() {
    if (activeSubItemIdx < activeItem.subItems.length - 1) {
      activeSubItemIdx += 1;
      activeSubItem = activeItem.subItems[activeSubItemIdx];
    } else if (activeItemIdx < items.length - 1) {
      activeItemIdx += 1;
      activeItem = items[activeItemIdx];
      activeSubItemIdx = 0;
      activeSubItem = activeItem.subItems[activeSubItemIdx];
    } else {
      activeItem = items[0];
      activeItemIdx = 0;
      activeSubItem = activeItem.subItems[0];
      activeSubItemIdx = 0;
    }

    highlightQueriedItems(items);
    setActiveItem(activeItem);
    setActiveSubItem(activeSubItem);
  }

  function selectPreviousItem() {
    if (activeSubItemIdx > 0) {
      activeSubItemIdx -= 1;
      activeSubItem = activeItem.subItems[activeSubItemIdx];
    } else if (activeItemIdx > 0) {
      activeItemIdx -= 1;
      activeItem = items[activeItemIdx];
      activeSubItemIdx = activeItem.subItems.length - 1;
      activeSubItem = activeItem.subItems[activeSubItemIdx];
    } else {
      activeItem = items[items.length - 1];
      activeItemIdx = items.length - 1;
      activeSubItemIdx = activeItem.subItems.length - 1;
      activeSubItem = activeItem.subItems[activeSubItemIdx];
    }

    highlightQueriedItems(items);
    setActiveItem(activeItem);
    setActiveSubItem(activeSubItem);
  }

  function executePrimaryAction() {
    switch (activeItem.type) {
      case TYPE_BINARY:
        handlePrimaryBinaryAction();
        break;
      case TYPE_GRAPHICALCHOICE:
        handlePrimaryGraphicalchoiceAction();
        break;
      case TYPE_HOTSPOT:
        handlePrimaryHotspotAction();
        break;
      case TYPE_MULTICHOICE:
        handlePrimaryMultichoiceAction();
        break;
      default:
        console.error('Invalid item type');
    }
  }

  function handlePrimaryBinaryAction() {
    const choices = activeSubItem.querySelectorAll('a');
    if (!choices || choices.length < 2) {
      console.error('No choices found');
      return;
    }

    const choice = choices[0];
    if (!choice) {
      console.error('Choice not found');
      return;
    }

    choice.click();
  }

  function handlePrimaryGraphicalchoiceAction() {
    // check if at submit item
    if (activeSubItem.tagName === 'BUTTON') {
      activeSubItem.click();
      // need to query because next section appears
      queryAllItems();
      return;
    }
    const link = activeSubItem.querySelector('a');
    if (!link) {
      console.error('Link not found');
      return;
    }

    link.click();

    // need to query because continue button could appear
    queryAllItems();
  }

  function handlePrimaryHotspotAction() {
    activeSubItem.click();
  }

  function handlePrimaryMultichoiceAction() {
    // check if at submit item
    if (activeSubItem.tagName === 'BUTTON') {
      activeSubItem.click();
      return;
    }
    const check = activeSubItem.querySelector('input');
    if (!check) {
      console.error('Check not found');
      return;
    }

    check.click();
  }

  function executeSecondaryAction() {
    if (activeItem.type === TYPE_BINARY) {
      handleSecondaryBinaryAction();
    }
  }

  function handleSecondaryBinaryAction() {
    const choices = activeSubItem.querySelectorAll('a');
    if (!choices || choices.length < 2) {
      console.error('No choices found');
      return;
    }

    const choice = choices[1];
    if (!choice) {
      console.error('Choice not found');
      return;
    }

    choice.click();
  }

  function findGraphicalChoiceItems() {
    const choices = frameDoc.querySelectorAll('ul.graphical-choices-list li');

    if (!choices.length) {
      return [];
    }

    const submitItem = choices[0].parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(
      "button[name='Continue']",
    );

    if (!submitItem) {
      return choices;
    }

    return [...choices, submitItem];
  }

  function findMultiChoiceItems() {
    const choices = frameDoc.querySelectorAll('ul.choices li');

    if (!choices.length) {
      return [];
    }

    const submitItem = choices[0].parentNode.parentNode.parentNode.parentNode.parentNode.querySelector(
      "button[name='Submit']",
    );

    if (!submitItem) {
      return choices;
    }

    return [...choices, submitItem];
  }

  function findHotspotItems() {
    return frameDoc.querySelectorAll('a.ctrhotspot-hotspot');
  }

  function findBinaryItems() {
    return frameDoc.querySelectorAll('div.row.binary-row');
  }

  function findNavNext() {
    return (
      frameDoc.querySelector('a.right.carousel-control') ||
      frameDoc.querySelector('a.footer-right-next')
    );
  }

  function navNext(item) {
    if (!item) {
      console.error('Next nav not found');
      return;
    }

    item.click();
  }

  function findNavPrev() {
    return (
      frameDoc.querySelector('a.left.carousel-control') ||
      frameDoc.querySelector('a.footer-right-back')
    );
  }

  function navPrev(item) {
    if (!item) {
      console.error('Prev nav not found');
      return;
    }

    item.click();
  }

  function clearData() {
    items = [];
    activeItem = null;
    activeItemIdx = null;
    activeSubItem = null;
    activeSubItemIdx = null;
  }
})();
