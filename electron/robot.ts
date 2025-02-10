// https://github.com/octalmage/robotjs/issues/466 Run ./node_modules/.bin/electron-rebuild to rebuild everything
//export const robot = require(`../public/binfiles/${process.platform}-${process.arch}-110/robotjs.node`);


export const robot = require("@jitsi/robotjs");

//console.log(robot)



type robotActionParam = {
  xTL: number;
  yTL: number;
  xBR: number;
  yBR: number;
  xCE: number;
  yCE: number;
};

robot.setMouseDelay(20);

export const rbClick = (point: {x: number, y: number}) => {
  robot.moveMouse(point.x, point.y);
  robot.mouseClick();
};

export const rbMouseDown = (point: {x: number, y: number}) => {
    robot.moveMouse(point.x, point.y);
    robot.mouseToggle("down");
}

export const rbMouseUp = (point: {x: number, y: number}) => {
    robot.moveMouse(point.x, point.y);
    robot.mouseToggle("up");
}

export const rbMove = (point: {x: number, y: number}) => {
    robot.moveMouse(point.x, point.y);
};

export const rbDrag = (point: {x: number, y: number}) => {
    robot.dragMouse(point.x, point.y);
};

export const getPoint = (param: robotActionParam, place: string) => {
    const { xTL, yTL, xBR, yBR, xCE, yCE } = param;
    const point = {
        x: xCE,
        y: yCE,
    }
    if (place === "right") {
        point.x = xBR;
        point.y = Math.round((yTL + yBR) / 2);
    }
    return point;
}
