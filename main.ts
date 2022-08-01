// As this is ported from LUA, this ugly functionnal programming code could be way cleaner
import * as event from "./event";
type Handlers = { "timer": (...args) => Handlers, "click": (...args) => Handlers }

const horlogium_offset = -19

const getDay = () => os.day();
const getHour = () => os.time();
const getMoonPhase = () => (getDay() + 7) % 8;
const [x, y] = term.getSize()
const handles: { [key: string]: [(...args) => Handlers] } = {}
const timers = []
import constellations from "./astral/constellations";
const list = Object.keys(constellations)
import rawImages from "./astral/images"
let images: (number[][][]) = []
for (let i = 0; i < 8; i++) {
    images.push(paintutils.parseImage(rawImages[i]))
}

function runTimer() {
    timers[os.startTimer((24 - getHour()) * 50)] = runTimer
    handles.timer.forEach((e, i) => handles.timer[i] = e().timer)
}

function drawCurrent(starty: number): Handlers {
    const height = 5
    const phase = getMoonPhase();
    paintutils.drawFilledBox(1, starty, x, starty + height, colors.black)
    paintutils.drawImage(images[phase], 1, 1)
    const current = Object.entries(constellations).filter(e => e[1].includes(phase)).map(e => e[0])
    term.setBackgroundColor(colors.black)
    term.setTextColor(colors.white)
    current.forEach((e, i) => {
        term.setCursorPos(8 + math.floor(i / height) * 10, (i % height) + starty)
        print(e)
    })
    paintutils.drawLine(1, height + starty, x, height + starty, colors.lightGray)
    const handler = {
        "timer": () => drawCurrent(starty),
        "click": () => handler
    };
    return handler;
}

function drawSearch(starty: number, constellation: string): Handlers {
    const height = 3
    const textY = starty + 1
    const phase = getMoonPhase();
    const days = constellations[constellation].reduce((prev, cur) => {
        if (cur < phase) cur += 8
        if (cur < prev) return cur
        return prev
    }, 8) - phase
    paintutils.drawLine(1, textY, x, textY, colors.black)
    term.setBackgroundColor(colors.black)
    term.setTextColor(colors.white)
    const text = `${constellation}: ${days} days`
    term.setCursorPos(1, textY)
    print("<")
    term.setCursorPos(x, textY)
    print(">")
    term.setCursorPos((x / 2 - math.floor(text.length / 2) + 1), textY)
    print(text)
    paintutils.drawLine(1, height + starty, x, height + starty, colors.lightGray)
    const handler = {
        "timer": () => drawCurrent(starty),
        "click": (id, posX, posY) => {
            if (posY == textY) {
                if (posX == 1) {
                    return drawSearch(starty, list[(list.indexOf(constellation) + 1) % list.length])
                } else if (posX == x) {
                    return drawSearch(starty, list[(list.indexOf(constellation) - 1) % list.length])
                }
            }
            return handler
        }
    };
    return handler;
}

function drawHorlogium(starty: number): Handlers {
    const height = 3
    const textY = starty + 1
    const days = (getDay() + horlogium_offset) % 32;
    paintutils.drawLine(1, textY, x, textY, colors.black)
    term.setBackgroundColor(colors.black)
    term.setTextColor(colors.white)
    const text = `horlogium: ${days} days`
    term.setCursorPos((x / 2 - math.floor(text.length / 2) + 1), textY)
    print(text)
    paintutils.drawLine(1, height + starty, x, height + starty, colors.lightGray)
    const handler = {
        "timer": () => drawHorlogium(starty),
        "click": () => handler
    };
    return handler;
}

term.setBackgroundColor(colors.black)
term.clear()

let currentHandler = drawCurrent(1)
let searchHandler = drawSearch(7, "vicio")
let horlogiumHandler = drawHorlogium(11)

handles.mouse_click = [searchHandler.click]

handles.timer = [currentHandler.timer]
handles.timer.push(searchHandler.timer)
handles.timer.push(horlogiumHandler.timer)

timers[os.startTimer((24 - getHour()) * 50)] = runTimer

while (true) {
    const ev = event.pullEventRawAs(event.GenericEvent);
    const [type, id, posX, posY, posZ] = ev.args[0]
    if (type == "terminate") {
        break
    }
    if (type == "mouse_click") {
        handles.mouse_click.forEach((e, i) => handles.mouse_click[i] = e(id, posX, posY, posZ).click)
    }
    if (type == "timer") {
        if (timers[id]) {
            timers[id]()
            delete timers[id]
        }
    }
}