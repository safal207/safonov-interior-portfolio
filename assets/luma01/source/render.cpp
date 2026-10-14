#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>
// LUMA 01: deterministic CPU signed-distance renderer. Scene units: metres, Z up.
struct V { double x,y,z; V(double a=0,double b=0,double c=0):x(a),y(b),z(c){} V operator+(V b)const{return {x+b.x,y+b.y,z+b.z};} V operator-(V b)const{return {x-b.x,y-b.y,z-b.z};} V operator*(double a)const{return {x*a,y*a,z*a};} V operator/(double a)const{return *this*(1/a);} };
double dot(V a,V b){return a.x*b.x+a.y*b.y+a.z*b.z;} double len(V a){return sqrt(dot(a,a));} V norm(V a){return a/len(a);} V cross(V a,V b){return {a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x};} V mul(V a,V b){return {a.x*b.x,a.y*b.y,a.z*b.z};} double clamp(double a,double l=0,double h=1){return std::min(h,std::max(l,a));} V mix(V a,V b,double t){return a*(1-t)+b*t;}
struct Shape {int kind,mat;V a,b;double radius,angle;}; std::vector<Shape> shapes;
double box(V p,V h,double r){V q={fabs(p.x)-h.x+r,fabs(p.y)-h.y+r,fabs(p.z)-h.z+r};return len({std::max(q.x,0.),std::max(q.y,0.),std::max(q.z,0.)})+std::min(std::max({q.x,q.y,q.z}),0.)-r;}
double dist(V p,const Shape&s){ if(s.kind==0){p=p-s.a;double c=cos(s.angle),t=sin(s.angle); p={p.x,c*p.y+t*p.z,-t*p.y+c*p.z};return box(p,s.b,s.radius);} V ab=s.b-s.a;double h=len(ab);V ax=ab/h;V q=p-s.a;double z=dot(q,ax);double rr=s.radius+(s.angle-s.radius)*clamp(z/h);double radial=len(q-ax*z)-rr;double end=std::max(-z,z-h);return std::min(std::max(radial,end),0.)+len({std::max(radial,0.),std::max(end,0.),0}); }
struct Hit{double d;int m;};
Hit scene(V p,bool floor=true){Hit h={floor?p.z:100.,0};for(auto&s:shapes){double d=dist(p,s);if(d<h.d)h={d,s.mat};}return h;}
V normal(V p){double e=.00015;return norm({scene(p+V(e,0,0)).d-scene(p-V(e,0,0)).d,scene(p+V(0,e,0)).d-scene(p-V(0,e,0)).d,scene(p+V(0,0,e)).d-scene(p-V(0,0,e)).d});}
double noise(V p){return (sin(p.x*19.17+p.y*61.73+p.z*29.43)+sin(p.x*45.1-p.y*13.7+p.z*83.1)*.5+sin(p.x*103.4+p.y*97.1-p.z*61.8)*.25)/1.75;}
double shadow(V p,V light){V delta=light-p;double stop=len(delta),t=.004,r=1.;V d=delta/stop;for(int i=0;i<42&&t<stop;i++){double h=scene(p+d*t,false).d;if(h<.0003)return .0;r=std::min(r,9*h/t);t+=clamp(h,.004,.15);}return clamp(r);}
double ao(V p,V n){double v=0,w=1;for(int i=1;i<=5;i++){double d=.018*i;v+=(d-scene(p+n*d).d)*w;w*=.62;}return clamp(1-v*6.5,.22,1.);}
V shade(V p,V n,V rd,int mat){V color;double rough=.6;
 if(mat==0){color={.66,.61,.52};rough=.85;}
 else if(mat==1){double g=.5+.5*sin(p.x*110+p.z*50+noise({p.x*2,p.y*.2,p.z*3})*2);double fine=noise(p*95);color=mix({.16,.068,.026},{.32,.164,.065},.33+.30*g+.035*fine);rough=.35;}
 else {double f=noise(p*230),weave=sin(p.x*2700)*sin(p.y*2700+p.z*700);color=V(.73,.675,.565)*(1+f*.055+weave*.025);rough=.9;}
 V l=norm(V(-2,-3,3.8)-p),l2=norm(V(2,1.7,2.4)-p);double sh=shadow(p+n*.002,V(-2,-3,3.8));double amb=ao(p,n);double hemi=.20+.13*(n.z*.5+.5);double key=std::max(dot(n,l),0.)*sh*.97;double fill=std::max(dot(n,l2),0.)*.26;
 V c=mul(color,V(1.03,1.0,.94))*(hemi*amb+key+fill*amb);V halfv=norm(l-rd);double spec=pow(std::max(dot(n,halfv),0.),mat==1?48:8)*(mat==1?.12:.012)*sh; c=c+V(spec,spec*.95,spec*.85);return c;
}
V ray(V ro,V rd){
 double lo=0,hi=100;double o[]={ro.x,ro.y,ro.z},v[]={rd.x,rd.y,rd.z},mn[]={-.45,-.42,-.002},mx[]={.45,.42,.97};
 for(int k=0;k<3;k++){if(fabs(v[k])<1e-10){if(o[k]<mn[k]||o[k]>mx[k])hi=-1;continue;}double a=(mn[k]-o[k])/v[k],b=(mx[k]-o[k])/v[k];lo=std::max(lo,std::min(a,b));hi=std::min(hi,std::max(a,b));}
 double t=lo;Hit h;bool hit=false;
 if(hi>=lo)for(int i=0;i<100&&t<=hi;i++){h=scene(ro+rd*t,false);if(h.d<.00045){hit=true;break;}t+=h.d*.83;}
 if(hit){V p=ro+rd*t;return shade(p,normal(p),rd,h.m);}
 if(rd.z<0){V p=ro+rd*(-ro.z/rd.z);return shade(p,V(0,0,1),rd,0);}
 return {.68,.64,.57};
}
double aces(double x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14));}
int main(int argc,char**argv){if(argc<9){std::cerr<<"render scene.txt output.ppm width height azimuth elevation distance samples\n";return 2;}std::ifstream in(argv[1]);Shape s;while(in>>s.kind>>s.mat>>s.a.x>>s.a.y>>s.a.z>>s.b.x>>s.b.y>>s.b.z>>s.radius>>s.angle)shapes.push_back(s);int W=atoi(argv[3]),H=atoi(argv[4]),AA=atoi(argv[8]);double az=atof(argv[5])*M_PI/180,el=atof(argv[6])*M_PI/180,d=atof(argv[7]);V target(0,0,.48),ro=target+V(cos(az)*cos(el)*d,sin(az)*cos(el)*d,sin(el)*d);V forward=norm(target-ro),right=norm(cross(forward,V(0,0,1))),up=cross(right,forward);std::vector<unsigned char> pix(W*H*3);double fov=.32;
 #pragma omp parallel for schedule(dynamic,4)
 for(int y=0;y<H;y++)for(int x=0;x<W;x++){V c;for(int sy=0;sy<AA;sy++)for(int sx=0;sx<AA;sx++){double px=(2*(x+(sx+.5)/AA)/W-1)*fov*double(W)/H;double py=(1-2*(y+(sy+.5)/AA)/H)*fov;V rd=norm(forward+right*px+up*py);c=c+ray(ro,rd);}c=c/double(AA*AA);double vig=1-.07*(pow((2.*x-W)/W,2)+pow((2.*y-H)/H,2));double vals[]={c.x,c.y,c.z};for(int k=0;k<3;k++)pix[(y*W+x)*3+k]=int(pow(aces(vals[k]*1.27*vig),1/2.2)*255+.5);}
 std::ofstream out(argv[2],std::ios::binary);out<<"P6\n"<<W<<" "<<H<<"\n255\n";out.write((char*)pix.data(),pix.size());std::cout<<argv[2]<<" "<<W<<"x"<<H<<" shapes="<<shapes.size()<<"\n";
}
