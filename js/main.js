/* global $ */

const zoom = 0.5;
const itemWidth = 180;
const itemHeight = 188;
const moveMargin = 10;
const rowMargin = 20;
const swipeMargin = 200;
let screens = 2;
let current = 0;
let apps = [];
let originScreenPos = [];
let hold = false;
let dragging = false;
let swiping = false;
let goingRight = false;
let goingLeft = false;
let appsOffset;
let holdTimeout;
let groupTimeout;
let toRightTimeout;
let toLeftTimeout;
let under;
let merge;
let oldPosX;
let oldPosY;
let newPos;
let startSwipe;
let swipeSpeed;

/**
* Get the current position of the element
* @param  {Object} elem element
* @return {number}      position
*/
function getPos(elem) {
    return parseInt(elem.attr('pos'), 10);
}

/**
* Move an element to a new position
* @param  {Object} elem element
*/
function move(elem) {
    const pos = getPos(elem);

    if (pos >= 24 && pos <= 27) {
        elem.css({ left: (pos % 4) * itemWidth, top: '20px' });
    } else {
        elem.css({ left: (pos % 4) * itemWidth, top: Math.floor(pos / 4) * itemHeight });
    }
}

/**
* Make a new group and merge overlaying elements
*/
function newGroup() {
    under.addClass('group');
    dragging = $('.dragging');
    if (!under.find('.item-anim').attr('data-name')) {
        const category = dragging.find('.icon').attr('data-cat');
        under.find('.item-anim').attr('data-name', category);
    }

    const appMin = dragging.find('.icon');
    appMin.attr('id', dragging.attr('id'));
    under.find('.item-anim').append(appMin);
    dragging.remove();

    const from = getPos(dragging);
    const to = $('.item').length;

    for (let i = from; i <= to; i += 1) {
        const item = $(`.screen#${current} .item[pos="${i}"]`);
        if (item.length !== 0) {
            const pos = getPos(item);
            item.attr('pos', pos - 1);
            move(item);
        }
    }
}

/**
* Adjust screens after a swipe
* @param  {number} screen screen to display
*/
function adjustSwipe(screen) {
    $('.screen').each((index, elem) => {
        $(elem).css('left', `${(-screen + index) * 100}%`);
    });
    $('.breadcrumb .dot.selected').removeClass('selected');
    $('.breadcrumb .dot').eq(screen).addClass('selected');
}

/**
* Add a screen a and breadcrumb dot
*/
function newScreen() {
    $('.screens').append(`<div class="screen transition" id="${screens}"><div class="apps"></div></div>`);
    screens += 1;
    $('.breadcrumb').append('<div class="dot"></div>');
}


/**
* Remove blank screens and breadcrumb dots
*/
function dumpScreens() {
    let blank = 0;

    $('.screen').each((index, elem) => {
        if ($(elem).find('.item').length === 0) {
            $(elem).remove();
            screens -= 1;
            blank += 1;
        }

        $(elem).attr('id', index - blank);
    });

    while ($(`.screen#${current} .item`).length === 0) {
        current -= 1;
    }
    adjustSwipe(current);

    $('.breadcrumb').empty();
    for (let i = 0; i < screens; i += 1) {
        $('.breadcrumb').append('<div class="dot"></div>');
    }
    $('.breadcrumb .dot').eq(current).addClass('selected');
}

/**
* Initialize dragging mode
* @param  {Object} e event
*/
function enableDrag(e) {
    dragging = true;
    oldPosX = e.pageX - $(e.currentTarget)[0].getBoundingClientRect().left;
    oldPosY = e.pageY - $(e.currentTarget)[0].getBoundingClientRect().top;

    // console.log($(e.currentTarget), $(e.currentTarget).closest('.item'));

    newPos = getPos($(e.currentTarget).closest('.item'));
    $(e.currentTarget).closest('.item').addClass('dragging');

    if ($('.screen:last-child .item').length > 0) {
        newScreen();
    }
}

/**
* Swipe screens
* @param  {Object} e event
*/
function swipe(e) {
    if (current === 0 && (e.pageX - appsOffset.left) > startSwipe) {
        swipeSpeed = 0.2;
    } else if (current === parseInt($('.screen:last-child').attr('id'), 10) && (e.pageX - appsOffset.left) < startSwipe) {
        swipeSpeed = 0.2;
    } else {
        swipeSpeed = 1;
    }
    $('.screen').each((index, elem) => {
        let screenPos = (((e.pageX - appsOffset.left) - startSwipe) * (1 / zoom)) * swipeSpeed;
        screenPos += originScreenPos[index];
        $(elem).css('left', screenPos);
    });
}

/**
* Switch an app from a screen to another
* @param  {Object} elem   element
* @param  {number} screen screen to move element to
*/
function switchScreen(elem, screen) {
    if (elem && screen !== null) {
        const originScreen = parseInt(elem.closest('.screen').attr('id'), 10);
        if (originScreen !== screen) {
            elem.appendTo('.container');
            elem.addClass('swiping');
            setTimeout(() => {
                const from = getPos(elem);
                const to = $(`.screen#${originScreen} .item`).length;
                setTimeout(() => {
                    for (let i = from; i <= to; i += 1) {
                        const thisItem = $(`.screen#${originScreen} .item[pos="${i}"]`);
                        if (thisItem.length !== 0) {
                            const thisPos = getPos(thisItem);
                            thisItem.attr('pos', thisPos - 1);
                            if (!thisItem.hasClass('dragging')) {
                                move(thisItem);
                            }
                        }
                    }
                }, 300);
                elem.attr('pos', $(`.screen#${screen} .item`).length);
                elem.removeClass('swiping');
                elem.appendTo(`.screen#${screen} .apps`);
                newPos = getPos($('.dragging'));
            }, 300);
        }
    }
}

/**
* Drag an item around
* @param  {Object} e event
*/
function drag(e) {
    const currentScreen = $('.dragging').closest('.screen').attr('id');
    const newX = Math.round(((e.pageX - appsOffset.left) - oldPosX) * (1 / zoom));
    const newY = Math.round(((e.pageY - appsOffset.top) - oldPosY) * (1 / zoom));

    $('.dragging').css({ left: newX, top: newY });

    let newRow = (newY + rowMargin) / itemHeight;
    newRow = Math.max(Math.floor(newRow), 0);

    // console.log('newX:', newX, 'newY:', newY, 'newRow:', newRow);

    // console.log(Math.round(appsOffset.left), e.pageX, Math.round(appsOffset.right));

    const toRight = (e.pageX > Math.round(appsOffset.right));
    const toLeft = (e.pageX < Math.round(appsOffset.left));

    if (toRight && !goingRight) {
        goingRight = true;
        toRightTimeout = setTimeout(() => {
            current += 1;
            current = Math.min(Math.max(current, 0), screens - 1);
            adjustSwipe(current);
            switchScreen($('.dragging'), current);
            goingRight = false;
        }, 500);
    } else if (toLeft && !goingLeft) {
        goingLeft = true;
        toLeftTimeout = setTimeout(() => {
            current -= 1;
            current = Math.min(Math.max(current, 0), screens - 1);
            adjustSwipe(current);
            switchScreen($('.dragging'), current);
            goingLeft = false;
        }, 500);
    } else if (!toRight && !toLeft) {
        goingRight = false;
        goingLeft = false;
        clearTimeout(toRightTimeout);
        clearTimeout(toLeftTimeout);
    }

    $(`.screen#${currentScreen} .item:not(.dragging)`).each((index, elem) => {
        const item = $(elem);
        const pos = getPos(item);
        const x = parseInt(item.css('left'), 10);
        const row = Math.floor(pos / 4);

        // console.log(item, 'x:', x, 'y:', y, 'row:', row);

        const moveLeft = (newX > x + moveMargin && newPos < pos);
        const moveRight = (newX < x - moveMargin && newPos > pos);
        const sameRow = (newRow === row);

        if (sameRow) {
            if (moveLeft || moveRight) {
                const diff = pos - newPos;
                const from = newPos;
                const to = pos;
                if (newPos > pos) {
                    for (let i = from; i >= to; i -= 1) {
                        const thisItem = $(`.screen#${currentScreen} .item[pos="${i}"]`);
                        const thisPos = getPos(thisItem);
                        thisItem.attr('pos', thisPos + 1);
                        if (!thisItem.hasClass('dragging')) {
                            move(thisItem);
                        }
                    }
                } else if (pos > newPos) {
                    for (let i = from; i <= to; i += 1) {
                        const thisItem = $(`.screen#${currentScreen} .item[pos="${i}"]`);
                        const thisPos = getPos(thisItem);
                        thisItem.attr('pos', thisPos - 1);
                        if (!thisItem.hasClass('dragging')) {
                            move(thisItem);
                        }
                    }
                }
                newPos += diff;
                $('.dragging').attr('pos', newPos);
            }
        }
    });
}

/**
* Clock system
* @param  {number} i position to start at
*/
function clock(i) {
    const item = `<div id="${i + 4}" pos="${i}" class="item anim" style="left:${(i % 4) * itemWidth}px; top: ${Math.floor(i / 4) * itemHeight}px;"><div class="item-anim"><div class="icon" style="background-image: url(img/${apps[i + 4].img})" data-name="${apps[i + 4].name}" data-cat="${apps[i + 4].cat}"></div></div>`;

    $('.screen#0 .apps').append(item);

    setTimeout(() => {
        $(`.item#${i + 4}`).removeClass('anim');
    }, 800);

    if (i < apps.length - 5) {
        setTimeout(() => {
            clock(i + 1);
        }, 50);
    }
}

/**
* Reset everything
*/
function reset() {
    hold = false;
    dragging = false;
    swiping = false;
    originScreenPos = [];
    move($('.dragging'));
    clearTimeout(holdTimeout);
    $('.dragging').removeClass('dragging');
    clearTimeout(groupTimeout);
    if (under) {
        under.removeClass('highlight-group');
    }
    merge = false;
    $('.open').removeClass('open');
    $('.blur').removeClass('blur');
}

$(global.document).ready(() => {
    $('.phone').css('transform', `scale(${zoom})`);
    appsOffset = $('.apps')[0].getBoundingClientRect();

    $.ajax({
        url: 'apps.json',
        success: (data) => {
            apps = data;

            for (let i = 0; i < 4; i += 1) {
                $('.dock .apps').append(`<div id="${i}" pos="${i + 24}" class="item anim" style="left:${((i + 24) % 4) * itemWidth}px; top: 20px;"><div class="item-anim"><div class="icon" style="background-image: url(img/${apps[i].img})" data-name="${apps[i].name}" data-cat="${apps[i + 4].cat}"></div></div>`);
            }

            clock(0);
        },
    });
});

$(global.window).on('resize', () => {
    appsOffset = $('.apps')[0].getBoundingClientRect();
});

$(global.document).on('mousedown', '.item', (e) => {
    hold = true;
    if (!$('.container').hasClass('draggable')) {
        holdTimeout = setTimeout(() => {
            if (hold) {
                $('.container').addClass('draggable');
                enableDrag(e);
            }
        }, 1000);
    } else {
        enableDrag(e);
    }
    return false;
});

$(global.document).on('mousedown', '.screens', (event) => {
    startSwipe = Math.round(event.pageX - appsOffset.left);
    swiping = true;
    $('.screen').removeClass('transition');
    $('.screen').each((index, elem) => {
        originScreenPos.push(parseInt($(elem).css('left'), 10));
    });
});

$(global.document).on('mouseup', () => {
    if (merge) {
        newGroup();
    } else if (swiping) {
        $('.screen').addClass('transition');

        const diff = parseInt($('.screen#0').css('left'), 10) - originScreenPos[0];
        if (diff > swipeMargin) {
            current -= 1;
        } else if (diff < -swipeMargin) {
            current += 1;
        }
        current = Math.min(Math.max(current, 0), screens - 1);
        adjustSwipe(current);
    }

    reset();
});

$(global.document).on('mouseenter', '.item', (e) => {
    if (dragging) {
        groupTimeout = setTimeout(() => {
            under = $(e.target).closest('.item');
            under.addClass('highlight-group');
            merge = true;
        }, 300);
    }
});

$(global.document).on('mouseleave', '.item', (e) => {
    const item = $(e.target).closest('.item');
    if (dragging && !item.hasClass('dragging')) {
        clearTimeout(groupTimeout);
        if (under) {
            under.removeClass('highlight-group');
            merge = false;
        }
    }
});

$(global.document).on('click', '.main-button', () => {
    dumpScreens();
    reset();
    $('.container').removeClass('draggable');
});

$(global.document).on('click', '.group', (e) => {
    $(e.currentTarget).toggleClass('open');

    $('.container img.bg').addClass('blur');
    $('.item:not(.open)').each((index, elem) => {
        $(elem).addClass('blur');
    });
});

$(global.document).on('mousemove', (e) => {
    if (dragging) {
        drag(e);
    } else if (swiping) {
        swipe(e);
    }
});
