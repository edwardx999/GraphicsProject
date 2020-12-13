
import { IUniform, Matrix4, Uniform, Vector3, ShaderLib, UniformsUtils, ShaderMaterial, Color } from "./lib/Three.js";
export { Uniforms, createShader };

interface Uniforms {
	[uniform: string]: IUniform;
	velocityRelCamera: { value: number };
	omega: Uniform & { value: Vector3 };
	center: Uniform & { value: Vector3 };
	lightSpeed: { value: number };
	cameraForward: Uniform & { value: Matrix4 };
};

const createShader = (baseUniforms: Partial<Uniforms> & { lightSpeed: { value: number } }) => {
	const uniforms = <Uniforms>UniformsUtils.clone(ShaderLib.phong.uniforms);
	baseUniforms.velocityRelCamera = baseUniforms.velocityRelCamera || { value: 0 };
	baseUniforms.omega = baseUniforms.omega || new Uniform(new Vector3());
	baseUniforms.color = baseUniforms.color || new Uniform(new Color());
	baseUniforms.center = baseUniforms.center || new Uniform(new Vector3());
	baseUniforms.cameraForward = baseUniforms.cameraForward || new Uniform(new Matrix4());
	for (const key in baseUniforms) {
		uniforms[key] = baseUniforms[key];
	}
	const material = <ShaderMaterial & { uniforms: Uniforms }>new ShaderMaterial({
		uniforms: uniforms,
		fragmentShader: fragmentShader,
		vertexShader: vertexShader,
		lights: true,
	});
	if (baseUniforms.map) {
		// @ts-ignore
		material.map = baseUniforms.map.value;
	}
	return material;
};

const vertexShader = `
// START TAKEN FROM THREE.JS lib
#define PHONG

varying vec3 vViewPosition;

#ifndef FLAT_SHADED

	varying vec3 vNormal;

#endif

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
// END TAKEN FROM THREE.JS lib

uniform float velocityRelCamera;
uniform vec3 omega;
uniform float lightSpeed;
uniform vec3 center;
uniform mat4 cameraForward;

varying vec3 vWorldPosition;

void main() 
{
	vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

	// START TAKEN FROM THREE.JS lib
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	vNormal = normalize( transformedNormal );
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = - mvPosition.xyz;

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
	// END TAKEN FROM THREE.JS lib
}
`
	;

const fragmentShader = `
// START TAKEN FROM THREE.JS lib
#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
// END TAKEN FROM THREE.JS lib

uniform float lightSpeed;
uniform vec3 omega;
uniform float velocityRelCamera;
uniform vec3 center;
uniform mat4 cameraForward;
varying vec3 vWorldPosition;

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
	return l * (1.0 + v / c * cos) / sqrt(1.0 - v * v / (c * c));
}

void main()
{
	
	// START TAKEN FROM THREE.JS lib
	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>

	// accumulation
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	#include <envmap_fragment>
	
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
	// END TAKEN FROM THREE.JS lib

	vec3 relPos = vWorldPosition - center;
	vec4 u = cameraForward * vec4(cross(omega, relPos), 0);
	vec3 up = vel_add(u.xyz, velocityRelCamera, lightSpeed);
	vec4 rotatedFrame = cameraForward * vec4(vWorldPosition - cameraPosition, 0);
	
	vec3 wavelengths = doppler(rgb_wavelengths, rotatedFrame.xyz, up, lightSpeed);

	vec3 rgb = mat3(wavelength_rgb(wavelengths[0]), wavelength_rgb(wavelengths[1]), wavelength_rgb(wavelengths[2])) * gl_FragColor.rgb;
	gl_FragColor = vec4(rgb, gl_FragColor.a);
}
`;

/**
 * calculate/provide velocity relative to camera:
 * 	 -- provide object velocity: uniform vec3 velocity
 * varying vec3 positionRelCameraForward = cameraForwardMatrix * position
 * calculate doppler shift from this velocity and position relative to camera
 */
// 
//   
// calculate vo = velocity of object relative to camera such that only x-component is non-zero