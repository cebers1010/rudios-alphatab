<template>
  <div class="at-app">
    <!-- Top Navbar -->
    <v-app-bar color="blue-grey-darken-1" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>RudiOS Music Player</v-toolbar-title>
      <v-spacer></v-spacer>
      
      <!-- Playback Controls in Navbar -->
      <v-btn 
        icon
        :disabled="!playerReady"
        @click="stop"
        aria-label="Stop playback"
      >
        <v-icon>mdi-stop</v-icon>
      </v-btn>
      <v-btn 
        icon
        :disabled="!playerReady"
        @click="playPause"
        :aria-label="playerState === PLAYER_STATES.PLAYING ? 'Pause playback' : 'Play playback'"
      >
        <v-icon>{{ playerState === PLAYER_STATES.PLAYING ? 'mdi-pause' : 'mdi-play' }}</v-icon>
      </v-btn>
      <!-- <span class="at-player-progress mr-4">{{ playerProgress }}%</span> -->
    </v-app-bar>

    <!-- Left Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
      width="285"
    >
      <v-list>
        <v-list-item title="Available Scores">
          <template v-slot:prepend>
            <v-icon>mdi-music-note</v-icon>
          </template>
        </v-list-item>
        <v-divider></v-divider>
        
        <!-- Loading indicator -->
        <v-list-item v-if="loadingSongs">
          <template v-slot:append>
            <v-progress-circular indeterminate></v-progress-circular>
          </template>
          <v-list-item-title>Loading songs...</v-list-item-title>
        </v-list-item>
        
        <!-- Song list -->
        <v-list-item 
          v-for="song in availableSongs" 
          :key="song.path"
          :value="song.path"
          :title="song.title"
          @click="loadSong(song.path)"
          :active="currentSong === song.path"
        >
          <template v-slot:prepend>
            <v-icon>{{ currentSong === song.path ? 'mdi-play-circle' : 'mdi-music-note' }}</v-icon>
          </template>
        </v-list-item>
        
        <!-- No songs found message -->
        <v-list-item v-if="!loadingSongs && availableSongs.length === 0">
          <v-list-item-title>No songs found</v-list-item-title>
        </v-list-item>
      </v-list>
      
      <template v-slot:append>
        <v-list>
          <v-list-item title="Settings">
            <template v-slot:prepend>
              <v-icon>mdi-cog</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main Content -->
    <div class="at-wrap">
      <div class="at-overlay" v-if="!isLoaded">
        <div class="at-overlay-content">
          <span v-if="loadError">{{ loadError }}</span>
          <span v-else>Music sheet is loading...</span>
        </div>
      </div>
      <div class="at-content">
        <div class="at-viewport">
          <div class="at-main" ref="alphaTab"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const PLAYER_STATES = {
  STOPPED: 0,
  PLAYING: 1,
  PAUSED: 2
};

export default {
  name: 'AlphaTabViewer',

  props: {
    scoreFile: {
      type: String,
      default: '/scores/runescape_barbarianism.gp5'
    },
    soundFont: {
      type: String,
      default: '/soundfont/muse_score_general.sf3'
    },
    fallbackSoundFont: {
      type: String,
      default: '/soundfont/sonivox.sf2'
    },
    fontDirectory: {
      type: String,
      default: '/assets/alphatab/font/'
    },
    workerDirectory: {
      type: String,
      default: '/alphatab-assets/worker/'
    }
  },

  data() {
    return {
      drawer: false, // New property for drawer state
      isLoaded: false,
      playerReady: false,
      playerState: PLAYER_STATES.STOPPED,
      playerProgress: 0,
      api: null,
      loadError: null,
      PLAYER_STATES,
      soundFontAttempts: 0,
      maxSoundFontAttempts: 2,
      availableSongs: [],
      loadingSongs: false,
      currentSong: ''
    };
  },

  mounted() {
    if (process.client) {
      this.loadAvailableSongs();
      this.currentSong = this.scoreFile;
      this.initializeAlphaTab();
    }
  },

  methods: {
    loadAvailableSongs() {
      this.loadingSongs = true;
      
      // Define the static list of available songs based on what we know is in the public/scores directory
      this.availableSongs = [
        { 
          title: 'Runescape - Barbarianism', 
          path: '/scores/runescape_barbarianism.gp5',
          format: 'gp'
        },
        // { 
        //   title: 'Canon in D', 
        //   path: '/scores/canon.gp',
        //   format: 'gp'
        // },
        // { 
        //   title: 'Muse - Knights of Cydonia', 
        //   path: '/scores/muse-knights_of_cydonia.gp3',
        //   format: 'gp3'
        // }
      ];
      
      this.loadingSongs = false;
    },
    
    async loadSong(path) {
      if (!this.api || this.currentSong === path) return;
      
      try {
        this.isLoaded = false;
        this.loadError = null;
        this.currentSong = path;
        
        // Stop any current playback
        this.api.stop();
        
        // Load the new score with the same tracks setting
        await this.api.load(path);
        
        console.log(`Song loaded: ${path}`);
      } catch (error) {
        console.error('Failed to load song:', error);
        this.loadError = `Failed to load song: ${error.message || 'Unknown error'}`;
        this.isLoaded = true;
      }
    },

    async initializeAlphaTab() {
      if (!this.$refs.alphaTab) {
        console.error('AlphaTab container reference not found');
        this.loadError = 'Failed to find container element';
        return;
      }

      try {
        // Using the direct import for non-worker version
        const { AlphaTabApi } = await import('@coderline/alphatab');

        if (!AlphaTabApi) {
          console.error('AlphaTabApi not available');
          this.loadError = 'AlphaTab library failed to load';
          return;
        }

        this.api = new AlphaTabApi(this.$refs.alphaTab, {
          core: {
            file: this.scoreFile,
            logLevel: 'debug',
            useWorkers: false,
            // workerFile: `${this.workerDirectory}alphaTab.worker.js`,
            tracks: [9], // Specify all 9 tracks as an array of indexes
            fontDirectory: this.fontDirectory // Add font directory configuration to core settings
          },
          player: {
            enablePlayer: true,
            soundFont: this.soundFont,
            scrollOffsetY: -64,
            // playbackOffset: -1000,
            // bufferTimeInMilliseconds: 1000
          },
          notation: {
            notationMode: 'GuitarPro'
          },
          display: {
            layoutMode: 'page',
            scale: 1.0,
            // Add cursor options to the display section
            staveProfile: 'scoretab',
            renderTarget: this.$refs.alphaTab
          },
          // Properly place cursor options inside settings
          cursors: {
            // highlight settings
            // 2 = Highlight only bar being played (default)
            // 1 = Highlight only current beat
            // 0 = Don't highlight
            followCursor: true,
            showCursor: true,
            showPlaybackCursor: true,
            highlightMode: 2
          },
          scrollMode: 'continuous',
        });

        if (this.api) {
          this.api.playerReady.on(() => {
            this.playerReady = true;
            this.isLoaded = true;
            console.log('AlphaTab player ready');
          });

          this.api.playerStateChanged.on((state) => {
            this.playerState = state.state;
          });

          this.api.soundFontLoad.on((e) => {
            console.log('SoundFont loading progress:', (e.loaded / e.total * 100).toFixed(2) + '%');
          });

          this.api.soundFontLoaded.on(() => {
            console.log('SoundFont successfully loaded');
            this.soundFontAttempts = 0;
          });

          this.api.soundFontLoadFailed.on(async (error) => {
            console.error('SoundFont failed to load:', error);
            this.soundFontAttempts += 1;

            if (this.soundFontAttempts < this.maxSoundFontAttempts) {
              console.log('Attempting to load fallback sound font:', this.fallbackSoundFont);
              try {
                this.api.loadSoundFont(this.fallbackSoundFont);
              } catch (fallbackError) {
                console.error('Fallback sound font failed to load:', fallbackError);
                this.loadError = 'Failed to load sound font after fallback attempt. Audio playback disabled.';
                this.isLoaded = true;
              }
            } else {
              this.loadError = 'All sound font loading attempts failed. Audio playback disabled.';
              this.isLoaded = true;
            }
          });

          this.api.playerPositionChanged.on((position) => {
            this.playerProgress = position.endTime > 0
              ? Math.round((position.currentTime / position.endTime) * 100)
              : 0;
          });

          this.api.scoreLoaded.on((score) => {
            this.isLoaded = true;
            
            // // Find the drum track
            // const drumTrack = score.tracks.find((track) => 
            //   // track.Name.toLowerCase().includes('drum') || 
            //   track.Name.toLowerCase().includes('percussion')
            // );
            
            // if (drumTrack) {
            //   console.log('Drum track found:', drumTrack.name);
            //   // Render only the drum track
            //   this.api.renderTracks([drumTrack.index]);
            // } else {
            //   console.log('No drum track found in this score');
            // }
          });

          this.api.error.on((error) => {
            console.error('AlphaTab error:', error);
            this.loadError = `AlphaTab error: ${error.message || 'Unknown error'}`;
          });
        }
      } catch (error) {
        console.error('Failed to initialize AlphaTab:', error);
        this.loadError = `Failed to initialize AlphaTab: ${error.message || 'Unknown error'}`;
      }
    },

    playPause() {
      if (this.api) this.api.playPause();
    },

    stop() {
      if (this.api) this.api.stop();
    }
  },

  beforeDestroy() {
    if (this.api) {
      this.api.playerReady.off();
      this.api.playerStateChanged.off();
      this.api.soundFontLoad.off();
      this.api.soundFontLoaded.off();
      this.api.soundFontLoadFailed.off();
      this.api.playerPositionChanged.off();
      this.api.scoreLoaded.off();
      this.api.error.off();
      this.api.destroy();
      this.api = null;
    }
  }
};
</script>

<style>
.at-wrap {
  /* max-width: 800px; */
  width:100%;
  margin: 0 auto;
  position: relative;
}

.at-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 10;
}

.at-content {
  position: relative;
}

.at-viewport {
  overflow-x: auto;
}

.at-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: center;
}

.at-btn {
  background: #436d9d;
  color: white;
  border: none;
  padding: 10px;
  cursor: pointer;
  font-size: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.at-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.at-player-progress {
  font-size: 16px;
  line-height: 40px;
}

.at-selection div {
    background: rgba(64, 64, 255, 0.1);
}

.at-cursor-bar {
    background: rgba(255, 242, 0, 0.25);
}

.at-cursor-beat {
    background: rgba(64, 64, 255, 0.75);
    width: 3px;
}

.at-highlight * {
    fill: #0078ff;
    stroke: #0078ff;
}
</style>