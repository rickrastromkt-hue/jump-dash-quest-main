import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoaded = false;
let apiReady = false;
const readyCallbacks: (() => void)[] = [];

function loadAPI() {
  if (apiLoaded) return;
  apiLoaded = true;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    readyCallbacks.forEach((cb) => cb());
    readyCallbacks.length = 0;
  };
}

function onAPIReady(cb: () => void) {
  if (apiReady) cb();
  else readyCallbacks.push(cb);
}

export function useYouTubePlayer(videoId: string) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingPlay = useRef(false);
  const readyRef = useRef(false);

  useEffect(() => {
    loadAPI();
    const div = document.createElement("div");
    div.id = "yt-hidden-player";
    div.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(div);
    containerRef.current = div;

    onAPIReady(() => {
      playerRef.current = new window.YT.Player("yt-hidden-player", {
        videoId,
        playerVars: { autoplay: 0, loop: 1, playlist: videoId, controls: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            playerRef.current?.setVolume(30);
            if (pendingPlay.current) {
              pendingPlay.current = false;
              playerRef.current?.playVideo();
            }
          },
        },
      });
    });

    return () => {
      playerRef.current?.destroy();
      containerRef.current?.remove();
    };
  }, [videoId]);

  const play = useCallback(() => {
    if (readyRef.current) {
      playerRef.current?.playVideo();
    } else {
      pendingPlay.current = true;
    }
  }, []);

  const stop = useCallback(() => {
    pendingPlay.current = false;
    playerRef.current?.pauseVideo();
    playerRef.current?.seekTo(0, true);
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  return { play, stop, pause };
}
