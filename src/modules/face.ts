import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs-node";

export interface Descriptor {
  content: Float32Array;
  toString: () => string;
  age?: number;
  expression?: faceapi.FaceExpressions;
  gender?: faceapi.Gender;
}

function face() {
  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 1,
  });

  const models = __dirname.replace("src/modules", "models");
  let booted = false;

  const matcher: {
    userId: string;
    matcher: () => faceapi.FaceMatcher;
  }[] = [];

  const boot = async () => {
    await tf.ready();

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(models);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(models);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(models);

    booted = true;
  };

  const describe = async (img: Buffer): Promise<Descriptor | null> => {
    if (!booted) throw new Error("Backend not booted yet");

    const tensor = tf.node.decodeImage(img, 3);
    const faces = await faceapi
      .detectAllFaces(tensor as unknown as faceapi.TNetInput, options)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withAgeAndGender()
      .withFaceExpressions();
    tf.dispose(tensor);

    if (!faces.length) {
      return null;
    }

    return {
      content: faces[0].descriptor,
      age: faces[0].age,
      expression: faces[0].expressions,
      gender: faces[0].gender,
      toString: () => JSON.stringify(faces[0].descriptor),
    };
  };

  const load = (content: string): Descriptor => {
    if (!booted) throw new Error("Backend not booted yet");

    return {
      content: Float32Array.from(Object.values(JSON.parse(content))),
      toString: () => content,
    };
  };

  const distance = (obj: Descriptor, src: Descriptor) => {
    if (!booted) throw new Error("Backend not booted yet");

    return Number(
      faceapi.euclideanDistance(obj.content, src.content).toFixed(1)
    );
  };

  return { boot, describe, load, distance };
}

export default face();
