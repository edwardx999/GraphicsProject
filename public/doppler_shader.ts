
import {IUniform, Matrix4, Uniform, Vector3} from "./lib/Three.js";
export {vertexShader, fragmentShader, UntexturedUniforms};

interface UntexturedUniforms {
	[uniform: string] : IUniform;
	v: {value: number};
	omega: Uniform & {value: Vector3};
	color: Uniform & {value: Vector3};
	center: Uniform & {value: Vector3};
	c: {value: number};
	cameraForward: Uniform & {value: Matrix4};
};

const vertexShader = {
	untextured:
`
uniform float v;
uniform vec3 omega;
uniform float c;
uniform vec3 center;
uniform vec3 color;
uniform mat4 cameraForward;

varying vec3 vPosition;

void main() 
{
	vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * modelViewPosition;
	vPosition = position;
}
`
};

const fragmentShader = {
	untextured:
`
uniform float c;
uniform vec3 omega;
uniform float v;
uniform vec3 center;
uniform vec3 color;
varying vec3 vPosition;

const vec3 rgb_wavelengths = vec3(650.0, 540.0, 470.0);

const mat3 xyz_rgb = mat3(
	vec2(0.41847, -0.091169), 0.0009290,
	vec2(-0.15866, 0.25243), 0.015708,
	vec2(-0.082835, 0.015708), 0.017869);

float gaussian(float x, float alpha, float mu, float sigma1, float sigma2)
{
	float squareRoot = (x - mu) / (x < mu ? sigma1 : sigma2);
	return alpha * exp(-(squareRoot * squareRoot) / 2.0);
}

vec3 xyz_wavelength(float lg)
{
	vec3 ret;
	ret[0] = gaussian(lg,  1.056, 5998.0, 379.0, 310.0)
	         + gaussian(lg,  0.362, 4420.0, 160.0, 267.0)
	         + gaussian(lg, -0.065, 5011.0, 204.0, 262.0);

	ret[1] = gaussian(lg,  0.821, 5688.0, 469.0, 405.0)
	         + gaussian(lg,  0.286, 5309.0, 163.0, 311.0);

    ret[2] = gaussian(lg,  1.217, 4370.0, 118.0, 360.0)
	         + gaussian(lg,  0.681, 4590.0, 260.0, 138.0);
	return ret;
}

vec3 wavelength_rgb(float wavelength) {
    float factor;
    float red, green, blue;

	if(wavelength < 380.0 && wavelength > 780.0)
	{
		red = 0.0;
		green = 0.0;
		blue = 0.0;
	}
	else if(wavelength < 440.0) 
	{
        red = -(wavelength - 440.0) / (440.0 - 380.0);
        green = 0.0;
        blue = 1.0;
	}
	else if(wavelength < 490.0)
	{
        red = 0.0;
        green = (wavelength - 440.0) / (490.0 - 440.0);
        blue = 1.0;
	}
	else if(wavelength < 510.0)
	{
        red = 0.0;
        green = 1.0;
        blue = -(wavelength - 510.0) / (510.0 - 490.0);
	}
	else if(wavelength < 580.0)
	{
        red = (wavelength - 510.0) / (580.0 - 510.0);
        green = 1.0;
        blue = 0.0;
	}
	else if(wavelength < 645.0) 
	{
        red = 1.0;
        green = -(wavelength - 645.0) / (645.0 - 580.0);
        blue = 0.0;
	}
	else
	{
        red = 1.0;
        green = 0.0;
        blue = 0.0;
    } 

    // Let the intensity fall off near the vision limits
	if (wavelength < 380.0 || wavelength > 780.0)
	{
		factor = 0.0;
	}
	else if(wavelength < 420.0)
	{
        factor = 0.3 + 0.7 * (wavelength - 380.0) / (420.0 - 380.0);
	}
	else if(wavelength < 701.0)
	{
        factor = 1.0;
	}
	else if(wavelength < 781.0)
	{
        factor = 0.3 + 0.7 * (780.0 - wavelength) / (780.0 - 700.0);
    }

    vec3 rgb;

    rgb[0] = red * factor;
    rgb[1] = green * factor;
    rgb[2] = blue * factor;

    return rgb;
}

vec3 vel_add(vec3 u, float v, float c)
{
	vec3 up;
	float c2 = c * c;
	float denom = (1.0 - v / c2 * u[0]);
	up[0] = (u[0] - v) / denom;
	float gamma = sqrt(1.0 - v * v / c2);
	float factor = gamma / denom;
	up[1] = factor * u[1];
	up[2] = factor * u[2];
	return up;
}

vec3 doppler(vec3 l, vec3 pos, vec3 vel, float c)
{
	float v = length(vel);
	if (v < 0.001)
	{
		return l;
	}
	float cos = dot(pos, vel) / length(pos) / v;
	return l * (1.0 + v / c * cos) / sqrt(1.0 + v * c / (c * c));
}

void main()
{
	// vec3 relPos = vPosition - center;
	// vec3 u = cross(omega, relPos);
	// vec3 up = vel_add(u, v, c);
	
	vec3 wavelengths = doppler(rgb_wavelengths, vPosition, vec3(v, 0.0, 0.0), c);

	// gl_FragColor = vec4(wavelength_rgb(rgb_wavelengths[0]), 1.0);
	// vec3 xyz = mat3(xyz_wavelength(wavelengths[0]), xyz_wavelength(wavelengths[1]), xyz_wavelength(wavelengths[1])) * color;
	vec3 rgb = mat3(wavelength_rgb(wavelengths[0]), wavelength_rgb(wavelengths[1]), wavelength_rgb(wavelengths[2])) * color;
	// gl_FragColor = vec4(color, 1.0);
	gl_FragColor = vec4(rgb, 1.0);
}
`
};

/**
 * rotate all coordinates such that camera is moving forward with velocity (scalar) v
 *   -- must provide rotation matrix for this: uniform mat4 cameraForwardMatrix
 *   -- must provide velocity of camera: uniform float cameraVelocity
 * calculate/provide velocity relative to camera:
 * 	 -- provide object velocity: uniform vec3 velocity
 * varying vec3 positionRelCameraForward = cameraForwardMatrix * position
 * calculate doppler shift from this velocity and position relative to camera
 */
// 
//   
// calculate vo = velocity of object relative to camera such that only x-component is non-zero