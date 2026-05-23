import * as ex from "excalibur";

export const bulletImageSource = new ex.ImageSource("/dollar.png");

export function createBulletAnimation(): ex.Animation {
  const sheet = ex.SpriteSheet.fromImageSource({
    image: bulletImageSource,
    grid: { rows: 1, columns: 3, spriteWidth: 24, spriteHeight: 16 }
  });
  return ex.Animation.fromSpriteSheet(sheet, [0, 1, 2], 100);
}
