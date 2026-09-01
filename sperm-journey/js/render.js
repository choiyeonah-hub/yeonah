/**
 * 정자의 여행 — 캔버스 그리기.
 * 상태를 바꾸지 않고 받은 상태를 그리기만 한다.
 */
window.SJ = window.SJ || {};

(function (SJ) {
  "use strict";

  var R = SJ.rules;
  var VIEW_W = R.VIEW_W;
  var VIEW_H = R.VIEW_H;

  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0 || w <= 0) return;
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  function drawTunnel(ctx, s, tint) {
    var step = 24;
    var x;
    var wx;

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (x = 0; x <= VIEW_W + step; x += step) {
      wx = s.distance + x;
      ctx.lineTo(x, R.tunnelCenter(wx) - R.tunnelHalf(wx));
    }
    ctx.lineTo(VIEW_W, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (x = 0; x <= VIEW_W + step; x += step) {
      wx = s.distance + x;
      ctx.lineTo(x, R.tunnelCenter(wx) + R.tunnelHalf(wx));
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = tint;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 3;
    [-1, 1].forEach(function (side) {
      ctx.beginPath();
      for (var px = 0; px <= VIEW_W + step; px += step) {
        var pwx = s.distance + px;
        var y = R.tunnelCenter(pwx) + side * R.tunnelHalf(pwx);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  /** 배경에서 함께 헤엄치는 다른 정자들. 충돌하지 않는 장식이다. */
  function drawSwimmers(ctx, s) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffffff";
    s.swimmers.forEach(function (sw) {
      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.scale(sw.scale, sw.scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      for (var i = 1; i <= 5; i += 1) {
        var t = i / 5;
        ctx.lineTo(-10 - t * 26, Math.sin(s.time / 90 + sw.phase + t * 5) * 8 * t);
      }
      ctx.stroke();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function drawEntities(ctx, s) {
    s.entities.forEach(function (e) {
      var x = e.x - s.distance;
      if (x < -220 || x > VIEW_W + 220) return;

      if (e.kind === "acid") {
        var acid = ctx.createRadialGradient(x, e.y, 2, x, e.y, e.r + 6);
        acid.addColorStop(0, "rgba(180,255,140,0.95)");
        acid.addColorStop(1, "rgba(90,190,60,0.15)");
        ctx.fillStyle = acid;
        ctx.beginPath();
        ctx.arc(x, e.y, e.r + 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "cell") {
        ctx.fillStyle = "rgba(240,240,255,0.92)";
        ctx.beginPath();
        var lobes = 9;
        for (var i = 0; i <= lobes; i += 1) {
          var a = (i / lobes) * Math.PI * 2;
          var r = e.r + Math.sin(a * 3 + s.time / 300 + e.seed) * 3.5;
          var px = x + Math.cos(a) * r;
          var py = e.y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(120,110,190,0.65)";
        ctx.beginPath();
        ctx.arc(x - 4, e.y - 3, e.r * 0.38, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "wall") {
        var top = R.tunnelCenter(e.x) - R.tunnelHalf(e.x);
        var bottom = R.tunnelCenter(e.x) + R.tunnelHalf(e.x);
        ctx.fillStyle = "rgba(255,236,196,0.82)";
        roundRect(ctx, x - 14, top, 28, e.gapY - e.gapH / 2 - top, 12);
        roundRect(ctx, x - 14, e.gapY + e.gapH / 2, 28, bottom - (e.gapY + e.gapH / 2), 12);
      } else if (e.kind === "current") {
        ctx.fillStyle = "rgba(120,220,255,0.14)";
        ctx.fillRect(x, 0, e.w, VIEW_H);
        ctx.strokeStyle = "rgba(160,235,255,0.6)";
        ctx.lineWidth = 2;
        for (var k = 0; k < 5; k += 1) {
          var ay = 60 + k * 75;
          var offset = ((s.time / 8 + k * 40) % e.w) - e.w;
          var ax = x + e.w + offset;
          ctx.beginPath();
          ctx.moveTo(ax + 18, ay - 9);
          ctx.lineTo(ax, ay);
          ctx.lineTo(ax + 18, ay + 9);
          ctx.stroke();
        }
      } else if (!e.taken) {
        var pulse = 1 + Math.sin(s.time / 220 + e.x) * 0.12;
        var glow = ctx.createRadialGradient(x, e.y, 1, x, e.y, 16 * pulse);
        glow.addColorStop(0, "#fff6c9");
        glow.addColorStop(1, "rgba(255,205,80,0.05)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, e.y, 16 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd75e";
        ctx.beginPath();
        ctx.arc(x, e.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /** 결승선인 난자. 마지막 한 화면에 들어올 때부터 보이기 시작한다. */
  function drawGoal(ctx, s) {
    var x = R.TOTAL_DISTANCE + R.PLAYER_X - s.distance;
    if (x > VIEW_W + 160) return;
    var y = R.tunnelCenter(R.TOTAL_DISTANCE + R.PLAYER_X);
    var r = 62;

    var glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.6);
    glow.addColorStop(0, "rgba(255,236,190,0.95)");
    glow.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe6a8";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 6;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(x, y, r + 10, s.time / 1400, s.time / 1400 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f0b45c";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer(ctx, s) {
    var blinking = s.time < s.invulnUntil && Math.floor(s.time / 110) % 2 === 0;
    if (blinking) return;

    var boosted = s.time < s.boostUntil;
    ctx.save();
    ctx.translate(R.PLAYER_X, s.y);
    ctx.rotate(R.clamp(s.vy * 0.035, -0.5, 0.5));

    ctx.strokeStyle = boosted ? "#ffe9a8" : "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-R.PLAYER_R + 2, 0);
    for (var i = 1; i <= 8; i += 1) {
      var t = i / 8;
      ctx.lineTo(-R.PLAYER_R - t * 34, Math.sin(s.time / 45 + t * 6.2) * 11 * t);
    }
    ctx.stroke();

    var head = ctx.createRadialGradient(-3, -4, 2, 0, 0, R.PLAYER_R + 4);
    head.addColorStop(0, "#ffffff");
    head.addColorStop(1, boosted ? "#ffd98a" : "#cfe4ff");
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.ellipse(0, 0, R.PLAYER_R + 3, R.PLAYER_R - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(ctx, s, phase) {
    var p = R.progressAt(s.distance);
    var barW = VIEW_W - 190;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    roundRect(ctx, 16, 14, barW, 14, 7);
    ctx.fillStyle = "#ffd75e";
    roundRect(ctx, 16, 14, Math.max(6, barW * p), 14, 7);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("🥚", 16 + barW + 4, 27);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(Math.round(p * 100) + "%", 16, 48);

    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("❤️".repeat(Math.max(0, s.hp)), VIEW_W - 140, 28);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("⚡ " + s.energy, VIEW_W - 140, 50);

    var stage = R.STAGES[s.stage];
    if (phase === "playing" && s.time < s.stageBannerUntil) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRect(ctx, VIEW_W / 2 - 230, VIEW_H - 78, 460, 56, 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.fillText(stage.name + " — " + stage.hint, VIEW_W / 2, VIEW_H - 55);
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(truncate(stage.fact, 46), VIEW_W / 2, VIEW_H - 34);
      ctx.textAlign = "left";
    }
  }

  SJ.render = function (ctx, s, dpr, phase) {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    var stage = R.STAGES[s.stage];
    var bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    bg.addColorStop(0, stage.top);
    bg.addColorStop(1, stage.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (s.shake > 0) {
      ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
    }

    drawTunnel(ctx, s, stage.tint);
    drawSwimmers(ctx, s);
    drawEntities(ctx, s);
    drawGoal(ctx, s);
    if (phase === "playing" || phase === "ready") drawPlayer(ctx, s);
    drawHud(ctx, s, phase);
    ctx.restore();
  };
})(window.SJ);
