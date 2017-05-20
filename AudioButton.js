import React, {Component} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  PermissionsAndroid,
  Platform
} from 'react-native';
import {Button, Icon, FormInput} from 'react-native-elements';
import * as Progress from 'react-native-progress';

import Sound from 'react-native-sound';
import {AudioRecorder, AudioUtils} from 'react-native-audio';

const {width, height} = Dimensions.get('window');

var recordPlayer;
var timer;

export default class AudioComponent extends Component {
  state = {
    currentTime: 0.0,
    recording: false,
    stoppedRecording: false,
    finished: false,
    audioPath: AudioUtils.DocumentDirectoryPath + '/test.aac',
    hasPermission: undefined,
    viewState: 0,
    playingState: true,
    playTotalTime: 0.0,
    currentPlayTime: 0.0,
  };

  prepareRecordingPath(audioPath) {
    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: "Low",
      AudioEncoding: "aac",
      AudioEncodingBitRate: 32000
    });
  }
  componentDidMount() {
    this._checkPermission().then((hasPermission) => {
      this.setState({hasPermission});

      if (!hasPermission) 
        return;
      
      this.prepareRecordingPath(this.state.audioPath);

      AudioRecorder.onProgress = (data) => {
        this.setState({
          currentTime: Math.floor(data.currentTime)
        });
      };

      AudioRecorder.onFinished = (data) => {
        // Android callback comes in the form of a promise instead.
        if (Platform.OS === 'ios') {
          this._finishRecording(data.status === "OK", data.audioFileURL);
        }
      };
    });
  }

  _checkPermission() {
    if (Platform.OS !== 'android') {
      return Promise.resolve(true);
    }

    const rationale = {
      'title': 'Microphone Permission',
      'message': 'AudioExample needs access to your microphone so you can record audio.'
    };

    return PermissionsAndroid
      .request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, rationale)
      .then((result) => {
        console.log('Permission result:', result);
        return (result === true || result === PermissionsAndroid.RESULTS.GRANTED);
      });
  }
  async _pause() {
    if (!this.state.recording) {
      console.warn('Can\'t pause, not recording!');
      return;
    }

    this.setState({stoppedRecording: true, recording: false});

    try {
      const filePath = await AudioRecorder.pauseRecording();

      // Pause is currently equivalent to stop on Android.
      if (Platform.OS === 'android') {
        this._finishRecording(true, filePath);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async _stop() {
    if (!this.state.recording) {
      console.warn('Can\'t stop, not recording!');
      return;
    }

    this.setState({stoppedRecording: true, recording: false, viewState: 2});

    try {
      const filePath = await AudioRecorder.stopRecording();

      if (Platform.OS === 'android') {
        this._finishRecording(true, filePath);
      }
      return filePath;
    } catch (error) {
      console.error(error);
    }
  }

  async _play() {
    if (this.state.recording) {
      await this._stop();
    }

    this.setState({playingState: false, currentPlayTime: 0, playTotalTime: 0});

    // These timeouts are a hacky workaround for some issues with
    // react-native-sound. See https://github.com/zmxv/react-native-sound/issues/89.
    setTimeout(() => {
      recordPlayer = new Sound(this.state.audioPath, '', (error) => {
        if (error) {
          console.log('failed to load the sound', error);
        }
      });

      setTimeout(() => {
        var totalTime = recordPlayer.getDuration();
        this.setState({playTotalTime: totalTime});
        timer = setInterval(() => {
          this.checkPlayingState();
        }, 100);
        recordPlayer.play((success) => {
          if (success) {
            console.log('successfully finished playing');
            this.setState({playingState: true});
          } else {
            this.setState({playingState: true});
            console.log('playback failed due to audio decoding errors');
          }
        });
      }, 100);
    }, 100);
  }
  checkPlayingState() { 
    if (this.state.playingState) {
      clearInterval(timer);
    } else {
      recordPlayer.getCurrentTime((seconds) => this.setState({currentPlayTime: seconds}));
    }
  }
  async _playStop() {
    
    this.setState({playingState: true})

    // These timeouts are a hacky workaround for some issues with
    // react-native-sound. See https://github.com/zmxv/react-native-sound/issues/89.
    setTimeout(() => {
      recordPlayer.stop();
    }, 100);
  }
  async _record() {
    if (this.state.recording) {
      console.warn('Already recording!');
      return;
    }

    if (!this.state.hasPermission) {
      console.warn('Can\'t record, no permission granted!');
      return;
    }

    if (this.state.stoppedRecording) {
      this.prepareRecordingPath(this.state.audioPath);
    }

    this.setState({recording: true, playTotalTime: 0, currentPlayTime : 0,  viewState: 1});

    try {
      const filePath = await AudioRecorder.startRecording();
    } catch (error) {
      console.error(error);
    }
  }

  _finishRecording(didSucceed, filePath) {
    this.setState({finished: didSucceed});
    console.log(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath}`);
  }
  onSaveButton() {
    this.setState({viewState: 0});
  }
  onCancelButton() {
    this._playStop();
    this.onSaveButton();
  }
  render() {
    console.log(this.state.playTotalTime);
    console.log(this.state.currentPlayTime);
    let bottomButton;

    if (this.state.viewState === 0) {
      bottomButton = (
        <View
          style={{
          width: width - 10,
          height: height * 0.2,
          backgroundColor: '#f0ee44',
          padding: 10
        }}>
          <View
            style={{
            flex: 1,
            backgroundColor: 'grey',
            justifyContent: 'center',
            alignItems: 'center'
          }}></View>
          <View
            style={{
            flex: 1,
            backgroundColor: 'grey',
            padding: 2,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Button
              large
              buttonStyle={{
              flex: 1,
              width: width * 0.9,
              borderRadius: 10,
              backgroundColor: 'red'
            }}
              onPress={() => this._record()}
              icon={{
              name: 'microphone',
              type: 'font-awesome'
            }}
              title='Tap to Start Recording'/>
          </View>
        </View>
      );
    } else if (this.state.viewState === 1) {
      bottomButton = (
        <View
          style={{
          width: width - 10,
          height: height * 0.2,
          backgroundColor: '#f0ee44',
          padding: 10
        }}>
          <View
            style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: 'grey',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Icon color={'red'} name='circle' type='font-awesome'/>
            <Text
              style={{
              color: 'red',
              marginLeft: 10
            }}>
              Recording - {this.state.currentTime}s
            </Text>
          </View>
          <View
            style={{
            flex: 1,
            backgroundColor: 'grey',
            padding: 3,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Button
              large
              buttonStyle={{
              flex: 1,
              width: width * 0.9,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'red'
            }}
              textStyle={{
              color: 'red'
            }}
              onPress={() => this._stop()}
              title='Tap to Stop Recording'/>
          </View>
        </View>
      );
    } else if (this.state.viewState === 2) {
      bottomButton = (
        <View
          style={{
          width: width - 10,
          height: height * 0.2,
          backgroundColor: '#f0ee44',
          padding: 10
        }}>
          <View
            style={{
            flex: 1,
            flexDirection: 'row',
            backgroundColor: 'grey',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {this.state.playingState
              ? <Button
                  large={false}
                  buttonStyle={{
                  width: width * 0.4,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: 'blue'
                }}
                  textStyle={{
                  color: 'blue'
                }}
                  onPress={() => this._play()}
                  title='Listen'/>
              : <TouchableOpacity onPress={() => this._playStop()}>
                  <View style={{width: width * 0.4, margin: 13 }}>
                    <Progress.Bar progress={this.state.playTotalTime === 0 ? 0 : this.state.currentPlayTime/this.state.playTotalTime} width={width * 0.4} height={height * 0.065} color={'#ff00ee'}/>
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center'}}>
                      <Text style={{color: 'white'}}>Stop Listening</Text>
                    </View>
                  </View>
              </TouchableOpacity>
              }
            <Button
              large={false}
              buttonStyle={{
              width: width * 0.4,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'red'
            }}
              textStyle={{
              color: 'red'
            }}
              onPress={() => this.onCancelButton()}
              title='Cancel'/>
          </View>
          <View
            style={{
            flex: 1,
            backgroundColor: 'grey',
            padding: 2,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Button
              large
              onPress={() => this.onSaveButton()}
              buttonStyle={{
              flex: 1,
              width: width * 0.9,
              borderRadius: 10,
              backgroundColor: 'green'
            }}
              title='Tap to save recording'/>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {bottomButton}
        
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5
  }
});